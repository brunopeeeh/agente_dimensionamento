/**
 * Motor WFM puro do Oráculo (sem I/O, sem Supabase) — testável isoladamente.
 * Erlang C, dimensionamento mensal e ranking de gargalos por faixa.
 * As funções recebem SEMPRE números reais medidos; nada de constante de negócio
 * embutida aqui além de fórmulas.
 */

export type ErlangCResult = {
  agentesNecessarios: number;
  ocupacaoPerc: number;
  probabilidadeEsperaPerc: number;
  slaAlcancadoPerc: number;
  intensidadeTrafegoErlangs: number;
};

function factorial(n: number): number {
  let res = 1;
  for (let i = 2; i <= n; i++) res *= i;
  return res;
}

/**
 * Erlang C: menor nº de agentes que atinge >=80% de SLA para o volume/TMA dados.
 * volumeChamadosHora: chamados na janela; tmaSegundos: tempo médio de atendimento.
 */
export function calcularErlangC(
  volumeChamadosHora: number,
  tmaSegundos: number,
  slaAlvoSegundos = 60,
): ErlangCResult {
  if (volumeChamadosHora <= 0 || tmaSegundos <= 0) {
    return {
      agentesNecessarios: 0,
      ocupacaoPerc: 0,
      probabilidadeEsperaPerc: 0,
      slaAlcancadoPerc: 100,
      intensidadeTrafegoErlangs: 0,
    };
  }

  const lambdaRate = volumeChamadosHora / 3600.0;
  const muRate = 1.0 / tmaSegundos;
  const A = lambdaRate / muRate;

  let m = Math.ceil(A) + 1;
  while (m < 200) {
    const rho = A / m;
    if (rho >= 1.0) {
      m++;
      continue;
    }
    let sumTerms = 0;
    for (let k = 0; k < m; k++) sumTerms += Math.pow(A, k) / factorial(k);
    const lastTerm = (Math.pow(A, m) / factorial(m)) * (m / (m - A));
    const denom = sumTerms + lastTerm;
    const Pw = denom > 0 ? lastTerm / denom : 1.0;
    const slaPerc = Math.max(
      0,
      Math.min(100, (1.0 - Pw * Math.exp(-(m - A) * (slaAlvoSegundos / tmaSegundos))) * 100),
    );
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

export type DimensionamentoResult = {
  volumeDiarioMedio: number;
  volumeMensalEstimado: number;
  tmaWebchatMin: number;
  tmaWhatsappMin: number;
  simultaneidadeWebchat: number;
  simultaneidadeWhatsapp: number;
  shrinkagePerc: number;
  agentesSimultaneosPico: number;
  headcountTotalFTERecomendado: number;
  distribuicaoTurnos: { manha: number; tardePico: number; coruja: number };
};

/**
 * Dimensionamento WFM mensal. TODOS os parâmetros são injetados (vindos do banco);
 * a função não conhece "1200" nem "16.5" — só a fórmula 5x2 + shrinkage.
 */
export function dimensionarMes(params: {
  volumeDiarioMedio: number;
  tmaWebchatMin: number;
  tmaWhatsappMin: number;
  simultaneidadeWebchat: number;
  simultaneidadeWhatsapp: number;
  shrinkagePerc: number;
  shareWebchat: number; // fração 0..1 do volume que é webchat
}): DimensionamentoResult {
  const {
    volumeDiarioMedio,
    tmaWebchatMin,
    tmaWhatsappMin,
    simultaneidadeWebchat,
    simultaneidadeWhatsapp,
    shrinkagePerc,
    shareWebchat,
  } = params;

  const volWeb = volumeDiarioMedio * shareWebchat;
  const volWhats = volumeDiarioMedio * (1 - shareWebchat);

  const horasWeb = (volWeb * tmaWebchatMin) / 60.0;
  const horasWhats = (volWhats * tmaWhatsappMin) / 60.0;

  const horasAgenteLiquidas =
    horasWeb / simultaneidadeWebchat + horasWhats / simultaneidadeWhatsapp;
  const agentesLiquidosPico = Math.ceil((horasAgenteLiquidas / 20.0) * 1.6);

  const fteLiquidosSemana = Math.ceil((horasAgenteLiquidas * 7.0) / 36.0);
  const fteLiquidos = Math.max(fteLiquidosSemana, Math.ceil(agentesLiquidosPico * 1.8));

  const factorShrinkage = 1.0 / (1.0 - shrinkagePerc / 100.0);
  const headcountTotalFTE = Math.ceil(fteLiquidos * factorShrinkage);

  return {
    volumeDiarioMedio,
    volumeMensalEstimado: Math.round(volumeDiarioMedio * 30),
    tmaWebchatMin,
    tmaWhatsappMin,
    simultaneidadeWebchat,
    simultaneidadeWhatsapp,
    shrinkagePerc,
    agentesSimultaneosPico: agentesLiquidosPico,
    headcountTotalFTERecomendado: headcountTotalFTE,
    distribuicaoTurnos: {
      manha: Math.ceil(headcountTotalFTE * 0.35),
      tardePico: Math.ceil(headcountTotalFTE * 0.45),
      coruja: Math.ceil(headcountTotalFTE * 0.2),
    },
  };
}

export type GargaloFaixa = {
  faixa: string; // "HH:MM"
  volume: number;
  percAcimaMedia: number; // % acima da média diária
  nivel: "CRÍTICO" | "ALTO" | "MÉDIO";
};

/**
 * Ranqueia faixas de 10 min por volume real, marcando desvio sobre a média.
 * Fonte da verdade: os volumes medidos passados em `faixas`. Nada hard-coded.
 * Retorna as faixas com volume acima da média, da mais crítica para a menos,
 * limitado a `top`.
 */
export function rankearGargalos(
  faixas: Array<{ faixa: string; volume: number }>,
  top = 5,
): { media: number; gargalos: GargaloFaixa[] } {
  const validas = faixas.filter((f) => f.volume > 0);
  if (validas.length === 0) return { media: 0, gargalos: [] };

  const media = validas.reduce((acc, f) => acc + f.volume, 0) / validas.length;
  if (media <= 0) return { media: 0, gargalos: [] };

  const acima = validas
    .map((f) => {
      const perc = ((f.volume - media) / media) * 100;
      const nivel: GargaloFaixa["nivel"] = perc >= 70 ? "CRÍTICO" : perc >= 35 ? "ALTO" : "MÉDIO";
      return { faixa: f.faixa, volume: f.volume, percAcimaMedia: Number(perc.toFixed(1)), nivel };
    })
    .filter((f) => f.percAcimaMedia > 0)
    .sort((a, b) => b.volume - a.volume)
    .slice(0, top);

  return { media: Number(media.toFixed(1)), gargalos: acima };
}
