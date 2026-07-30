import process from "node:process";
import fs from "node:fs";
import path from "node:path";
import {
  analisarGargalos,
  dimensionarMesAtual,
  listarCompetencias,
  calcularErlangCTool,
} from "./oraculo-data.server";

/**
 * Agente Oráculo unificado (Vercel-native). Loop de tool calling compatível com
 * OpenAI: chama o LLM, executa as tools (que leem o Supabase real), streama a
 * resposta final. Emite eventos SSE no contrato que o front já consome:
 *   {"type":"tool_call","data":{name,status,result}}  e  {"type":"content","data":"..."}
 */

// --- Provider (NVIDIA GLM primário, OpenRouter fallback) ----------------
function getEnvVar(key: string): string {
  if (process.env[key]) return process.env[key]!;
  try {
    const envPath = path.resolve(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const match = fs.readFileSync(envPath, "utf-8").match(new RegExp(`^${key}=(.*)$`, "m"));
      if (match) {
        let val = match[1].trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
          val = val.slice(1, -1);
        process.env[key] = val;
        return val;
      }
    }
  } catch {
    /* ignore */
  }
  return "";
}

const NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "z-ai/glm-5.2";

function getProvider(): { url: string; apiKey: string; model: string; headers: Record<string, string> } {
  const nvidiaKey = getEnvVar("NVIDIA_API_KEY");
  const openrouterKey = getEnvVar("OPENROUTER_API_KEY");
  if (nvidiaKey || !openrouterKey) {
    return {
      url: getEnvVar("NVIDIA_BASE_URL") || NVIDIA_URL,
      apiKey: nvidiaKey,
      model: getEnvVar("NVIDIA_MODEL") || DEFAULT_MODEL,
      headers: {},
    };
  }
  return {
    url: OPENROUTER_URL,
    apiKey: openrouterKey,
    model: getEnvVar("OPENROUTER_MODEL") || DEFAULT_MODEL,
    headers: {
      "HTTP-Referer": "https://dimensionamento.yooga.local",
      "X-Title": "Yooga Dimensionamento Oráculo",
    },
  };
}

// --- System prompt (conciso, honesto — sem narrativa de mês fixo) -------
const SYSTEM_PROMPT = `Você é o ORÁCULO DE DIMENSIONAMENTO CARE da Yooga — consultor sênior de WFM (Workforce Management) e dimensionamento de suporte.

REGRAS DE OURO:
1. NUNCA invente números. Para volume, gargalos, dimensionamento ou meses disponíveis, você DEVE chamar as ferramentas — elas leem os dados REAIS do banco (Supabase).
2. As ferramentas retornam o campo "mes"/"competencia" que consultaram e um bloco "fontes"/"fonte_dados". SEMPRE deixe claro na resposta de qual mês são os dados e o que é REAL vs ASSUMIDO. Se a ferramenta retornar {"erro": ...}, explique o erro ao usuário e NÃO fabrique dados.
3. Se o usuário perguntar por um mês, passe-o no parâmetro "mes" da ferramenta. Se não houver dados desse mês, a ferramenta lista os meses disponíveis — repasse isso honestamente. Nunca afirme ter dados de um mês que você não consultou.
4. Se não sabe quais meses existem, chame "listar_meses_disponiveis" primeiro.

CONTEXTO OPERACIONAL: suporte 07:00–03:00 (20h/dia), faixas de 10 min. Webchat é a fila prioritária (3 chats/agente, SLA 60s); WhatsApp é overflow (4 chats/agente, SLA 300s). Ao achar gargalos, recomende primeiro ajuste de escala/turnos, depois contratação.

TOM: analítico, direto, denso, sem jargão vazio. Responda em Português do Brasil, Markdown limpo.`;

// --- Tools ---------------------------------------------------------------
const TOOLS_SCHEMA = [
  {
    type: "function",
    function: {
      name: "listar_meses_disponiveis",
      description:
        "Lista os meses (competências) que realmente têm dados carregados no banco. Use quando o usuário perguntar de qual período há dados, ou antes de dimensionar um mês incerto.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "analisar_gargalos",
      description:
        "Retorna as faixas de horário mais críticas de um mês, calculadas a partir do volume REAL por faixa de 10 min no banco. Percentuais são desvio real sobre a média.",
      parameters: {
        type: "object",
        properties: {
          mes: {
            type: "string",
            description:
              "Mês alvo (ex: 'Junho 2026', 'junho', '2026-06'). Se omitido, usa o mês mais recente com dados.",
          },
          canal: {
            type: "string",
            enum: ["webchat", "whatsapp"],
            description: "Canal a analisar. Padrão: webchat (fila prioritária).",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "dimensionar_mes",
      description:
        "Dimensionamento WFM completo de um mês usando volume diário REAL do banco + parâmetros de negócio (simultaneidade, shrinkage) com vigência. Retorna headcount FTE e distribuição de turnos.",
      parameters: {
        type: "object",
        properties: {
          mes: {
            type: "string",
            description:
              "Mês alvo (ex: 'Julho 2026'). Se omitido, usa o mês mais recente com dados.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calcular_erlang_c",
      description:
        "Erlang C puro: nº mínimo de agentes para um volume/hora e TMA dados. Use para cenários pontuais informados pelo usuário.",
      parameters: {
        type: "object",
        properties: {
          volume_chamados_hora: { type: "number", description: "Chamados por hora." },
          tma_segundos: { type: "number", description: "Tempo médio de atendimento em segundos." },
          sla_alvo_segundos: { type: "number", description: "Limite do SLA em segundos (padrão 60)." },
        },
        required: ["volume_chamados_hora", "tma_segundos"],
      },
    },
  },
];

async function runTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "listar_meses_disponiveis":
      return await listarCompetencias();
    case "analisar_gargalos":
      return await analisarGargalos(args as { mes?: string; canal?: "webchat" | "whatsapp" });
    case "dimensionar_mes":
      return await dimensionarMesAtual(args as { mes?: string });
    case "calcular_erlang_c":
      return calcularErlangCTool(
        args as { volume_chamados_hora: number; tma_segundos: number; sla_alvo_segundos?: number },
      );
    default:
      return { erro: `Ferramenta ${name} não encontrada.` };
  }
}

// --- Tipos ---------------------------------------------------------------
export type OraculoEvent =
  | { type: "content"; data: string }
  | { type: "tool_call"; data: { name: string; status: "completed"; result: unknown } };

type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }>;
  tool_call_id?: string;
};

export type OraculoChatInput = {
  message: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  pageContext?: Record<string, unknown>;
};

// --- Loop principal ------------------------------------------------------
export async function* chatOraculo(input: OraculoChatInput): AsyncGenerator<OraculoEvent> {
  const provider = getProvider();
  if (!provider.apiKey) {
    yield {
      type: "content",
      data:
        "⚠️ Provedor de IA não configurado (defina NVIDIA_API_KEY ou OPENROUTER_API_KEY no .env). Não é possível responder.",
    };
    return;
  }

  let systemContent = SYSTEM_PROMPT;
  if (input.pageContext && Object.keys(input.pageContext).length > 0) {
    systemContent += `\n\n### CONTEXTO DA TELA ATUAL DO USUÁRIO (dados ao vivo do cockpit):\n${JSON.stringify(input.pageContext)}`;
  }

  const messages: ChatMessage[] = [
    { role: "system", content: systemContent },
    ...(input.history ?? []).map((h) => ({ role: h.role, content: h.content })),
    { role: "user", content: input.message },
  ];

  // 1ª chamada: decide tools (sem stream para tratar tool_calls com precisão).
  let first: Response;
  try {
    first = await fetch(provider.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        "content-type": "application/json",
        ...provider.headers,
      },
      body: JSON.stringify({
        model: provider.model,
        messages,
        tools: TOOLS_SCHEMA,
        tool_choice: "auto",
        temperature: 0.6,
        max_tokens: 4096,
        stream: false,
      }),
    });
  } catch (e) {
    yield { type: "content", data: `⚠️ Erro ao contatar o provedor de IA: ${e instanceof Error ? e.message : String(e)}` };
    return;
  }

  if (!first.ok) {
    const body = await first.text();
    yield { type: "content", data: `⚠️ Provedor retornou ${first.status}: ${body.slice(0, 200)}` };
    return;
  }

  const firstData = (await first.json()) as {
    choices?: Array<{ message?: ChatMessage }>;
  };
  const assistantMsg = firstData.choices?.[0]?.message;

  // Sem tools: resposta direta.
  if (!assistantMsg?.tool_calls || assistantMsg.tool_calls.length === 0) {
    yield { type: "content", data: assistantMsg?.content ?? "" };
    return;
  }

  // Executa tools e injeta resultados.
  messages.push(assistantMsg);
  for (const tc of assistantMsg.tool_calls) {
    let args: Record<string, unknown> = {};
    try {
      args = tc.function.arguments ? JSON.parse(tc.function.arguments) : {};
    } catch {
      args = {};
    }
    const result = await runTool(tc.function.name, args);
    yield { type: "tool_call", data: { name: tc.function.name, status: "completed", result } };
    messages.push({
      role: "tool",
      tool_call_id: tc.id,
      content: JSON.stringify(result),
    });
  }

  // 2ª chamada: resposta final formatada, com streaming.
  let second: Response;
  try {
    second = await fetch(provider.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        "content-type": "application/json",
        ...provider.headers,
      },
      body: JSON.stringify({
        model: provider.model,
        messages,
        temperature: 0.6,
        max_tokens: 4096,
        stream: true,
      }),
    });
  } catch (e) {
    yield { type: "content", data: `⚠️ Erro ao gerar resposta final: ${e instanceof Error ? e.message : String(e)}` };
    return;
  }

  if (!second.ok || !second.body) {
    const body = second.body ? await second.text() : "sem corpo";
    yield { type: "content", data: `⚠️ Provedor retornou ${second.status} na resposta final: ${String(body).slice(0, 200)}` };
    return;
  }

  const reader = second.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n");
    buffer = parts.pop() ?? "";
    for (const line of parts) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") continue;
      try {
        const json = JSON.parse(payload) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) yield { type: "content", data: delta };
      } catch {
        /* chunk parcial, ignora */
      }
    }
  }
}
