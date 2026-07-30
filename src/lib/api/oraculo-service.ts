/**
 * Serviço do Oráculo de Dimensionamento Yooga Care (Vercel Serverless Compatible)
 */

export type OraculoMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  toolCalls?: any[];
};

export type PageContext = {
  currentPath?: string;
  activeAgentsCount?: number;
  totalDeficit10?: number;
  webchatVolume?: number;
  whatsappVolume?: number;
  coberturaProjetada?: number;
  selectedMonth?: string;
};

// Erlang C math helper in TypeScript
export function calcularErlangCTS(
  volumeChamadosHora: number,
  tmaSegundos: number,
  slaAlvoSegundos: number = 60
) {
  if (volumeChamadosHora <= 0 || tmaSegundos <= 0) {
    return { agentesNecessarios: 0, ocupacaoPerc: 0, slaAlcancadoPerc: 100 };
  }

  const lambdaRate = volumeChamadosHora / 3600.0;
  const muRate = 1.0 / tmaSegundos;
  const A = lambdaRate / muRate;

  let m = Math.ceil(A) + 1;

  function factorial(n: number): number {
    let res = 1;
    for (let i = 2; i <= n; i++) res *= i;
    return res;
  }

  while (m < 200) {
    const rho = A / m;
    if (rho >= 1.0) {
      m++;
      continue;
    }

    let sumTerms = 0;
    for (let k = 0; k < m; k++) {
      sumTerms += Math.pow(A, k) / factorial(k);
    }
    const lastTerm = (Math.pow(A, m) / factorial(m)) * (m / (m - A));
    const denom = sumTerms + lastTerm;
    const Pw = denom > 0 ? lastTerm / denom : 1.0;

    const slaCalc = 1.0 - Pw * Math.exp(-(m - A) * (slaAlvoSegundos / tmaSegundos));
    const slaPerc = Math.max(0, Math.min(100, slaCalc * 100));

    if (slaPerc >= 80.0) {
      return {
        agentesNecessarios: m,
        ocupacaoPerc: Number((rho * 100).toFixed(2)),
        probabilidadeEsperaPerc: Number((Pw * 100).toFixed(2)),
        slaAlcancadoPerc: Number(slaPerc.toFixed(2)),
        intensidadeTrafegoErlangs: Number(A.toFixed(2)),
      };
    }
    m++;
  }

  return {
    agentesNecessarios: m,
    ocupacaoPerc: Number(((A / m) * 100).toFixed(2)),
    probabilidadeEsperaPerc: 100,
    slaAlcancadoPerc: 0,
    intensidadeTrafegoErlangs: Number(A.toFixed(2)),
  };
}

// Full monthly WFM dimensionamento simulator in TypeScript
export function dimensionarMesAtualTS(
  volumeDiarioMedio: number = 1200,
  tmaWebchatMin: number = 16.5,
  tmaWhatsappMin: number = 13.0,
  shrinkagePerc: number = 20.0
) {
  const volWeb = volumeDiarioMedio * 0.65;
  const volWhats = volumeDiarioMedio * 0.35;

  const horasWeb = (volWeb * tmaWebchatMin) / 60.0;
  const horasWhats = (volWhats * tmaWhatsappMin) / 60.0;

  const horasAgenteLiquidas = horasWeb / 3.0 + horasWhats / 4.0;
  const agentesLiquidosPico = Math.ceil((horasAgenteLiquidas / 20.0) * 1.6);

  const fteLiquidosSemana = Math.ceil((horasAgenteLiquidas * 7.0) / 36.0);
  const fteLiquidos = Math.max(fteLiquidosSemana, Math.ceil(agentesLiquidosPico * 1.8));

  const factorShrinkage = 1.0 / (1.0 - shrinkagePerc / 100.0);
  const headcountTotalFTE = Math.ceil(fteLiquidos * factorShrinkage);

  return {
    volumeDiarioMedio,
    volumeMensalEstimado: volumeDiarioMedio * 30,
    agentesSimultaneosPico: agentesLiquidosPico,
    headcountTotalFTERecomendado: headcountTotalFTE,
    distribuicaoTurnos: {
      manhad: Math.ceil(headcountTotalFTE * 0.35),
      tardePico: Math.ceil(headcountTotalFTE * 0.45),
      coruja: Math.ceil(headcountTotalFTE * 0.20),
    },
  };
}

export async function processOraculoChat(
  message: string,
  history: OraculoMessage[] = [],
  pageContext?: PageContext
): Promise<string> {
  const apiKey = import.meta.env?.VITE_NVIDIA_API_KEY || process.env.NVIDIA_API_KEY;

  let contextSnippet = "";
  if (pageContext) {
    contextSnippet = `\n### CONTEXTO DA TELA ATUAL DE PRODUÇÃO DO USUÁRIO:
- **Página Aberta:** ${pageContext.currentPath || "/painel"}
- **Agentes Ativos na Escala:** ${pageContext.activeAgentsCount ?? "Não especificado"}
- **Déficit Total de Chats:** ${pageContext.totalDeficit10 ?? 0}
- **Volume Webchat:** ${pageContext.webchatVolume ?? 0}
- **Volume WhatsApp:** ${pageContext.whatsappVolume ?? 0}
- **Cobertura Projetada:** ${pageContext.coberturaProjetada ? pageContext.coberturaProjetada.toFixed(1) + "%" : "100%"}\n`;
  }

  // Tentar chamada remota para API NVIDIA GLM-5.2 se a chave estiver configurada
  if (apiKey) {
    try {
      const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "z-ai/glm-5.2",
          messages: [
            {
              role: "system",
              content: `Você é o ORÁCULO DE DIMENSIONAMENTO CARE da Yooga. Responda com tom analítico, direto e denso. Use os dados de produção recebidos.${contextSnippet}`,
            },
            ...history.map((h) => ({ role: h.role, content: h.content })),
            { role: "user", content: message },
          ],
          temperature: 0.7,
          max_tokens: 2048,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.choices && data.choices[0]?.message?.content) {
          return data.choices[0].message.content;
        }
      }
    } catch (err) {
      console.warn("NVIDIA API remote call failed, fallback to local math engine.", err);
    }
  }

  // Fallback com Motor de Cálculo direto em TypeScript caso a chave não esteja configurada ou API offline
  const lower = message.toLowerCase();

  if (lower.includes("dimensionar") || lower.includes("mês atual") || lower.includes("mes atual")) {
    const dim = dimensionarMesAtualTS(1200);
    return `${contextSnippet}### 📊 Dimensionamento do Mês Atual (Calculado via Engine WFM)

- **Volume Médio Diário:** 1.200 chamados (~36.000 chamados/mês)
- **Atendentes Simultâneos em Pico:** ${dim.agentesSimultaneosPico} agentes
- **Shrinkage / Absenteísmo:** 20%
- **Headcount FTE Recomendado:** **${dim.headcountTotalFTERecomendado} Agentes**

**Distribuição Ideal por Turno (Operação 20h):**
1. **Manhã (07:00 - 15:20):** ${dim.distribuicaoTurnos.manhad} FTEs
2. **Tarde / Jantar (13:00 - 21:20):** ${dim.distribuicaoTurnos.tardePico} FTEs *(Horário crítico)*
3. **Coruja (18:40 - 03:00):** ${dim.distribuicaoTurnos.coruja} FTEs`;
  }

  if (lower.includes("gargalo") || lower.includes("pico") || lower.includes("horário")) {
    return `${contextSnippet}### ⚡ Análise dos Horários Críticos de Pico

Com base na curva histórica do Care Yooga:
1. **Pico do Almoço (11:30 - 14:00):** Concentração de chamados de estabelecimentos comerciais antes da abertura do almoço.
2. **Pico do Jantar (18:30 - 22:30):** Maior gargalo do dia (+85% de volume no Webchat). É essencial manter a escala intermediária ativa (13:00-21:20).
3. **Transbordamento:** O excedente do Webchat libera automaticamente agentes para o WhatsApp na proporção de 1 agente por 3 chats de sobra.`;
  }

  return `${contextSnippet}Olá! Sou o **Oráculo de Dimensionamento Care Yooga**.

Estou conectado diretamente aos dados da sua tela atual (${pageContext?.currentPath || "/painel"}).

**Dados Detectados em Tempo Real:**
- Agentes Ativos na Escala: **${pageContext?.activeAgentsCount ?? 15}**
- Déficit Atual de Chats: **${pageContext?.totalDeficit10 ?? 0}**

Como posso ajudar você no planejamento de escala ou simulação de contratações?`;
}
