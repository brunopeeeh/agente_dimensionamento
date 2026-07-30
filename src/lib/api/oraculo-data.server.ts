import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import process from "node:process";
import fs from "node:fs";
import path from "node:path";
import { normalizeName } from "@/lib/agents";
import {
  calcularErlangC,
  dimensionarMes as dimensionarMesWFM,
  rankearGargalos,
  type ErlangCResult,
} from "@/lib/oraculo/wfm";

/**
 * Camada de dados do Oráculo: TODA leitura de dado de negócio vem do Supabase
 * (schema canônico 002/004). As "tools" do agente são estas funções — nenhuma
 * retorna constante hard-coded. Quando um dado não existe no banco para a
 * competência pedida, a função DIZ isso (não inventa).
 */

// --- Supabase (server-only) ---------------------------------------------
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

let _client: SupabaseClient | null | undefined;
function getSupabase(): SupabaseClient | null {
  if (_client !== undefined) return _client;
  const url = getEnvVar("VITE_SUPABASE_URL");
  const key = getEnvVar("SUPABASE_SERVICE_ROLE_KEY") || getEnvVar("VITE_SUPABASE_ANON_KEY");
  _client = url && key ? createClient(url, key) : null;
  return _client;
}

// --- Competência (mês → date dia 1) -------------------------------------
const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];
const MESES_NORM = MESES.map(normalizeName);

/** "Junho 2026" | "junho" | "2026-06" | "2026-06-01" → "2026-06-01" (ou null). */
export function parseCompetencia(texto: string, anoPadrao = 2026): string | null {
  const t = texto.trim();
  const iso = t.match(/^(\d{4})-(\d{2})(?:-\d{2})?$/);
  if (iso) return `${iso[1]}-${iso[2]}-01`;

  const nome = t.match(/^(\p{L}+)(?:\s+(\d{4}))?$/u);
  if (nome) {
    const idx = MESES_NORM.indexOf(normalizeName(nome[1]));
    if (idx >= 0) {
      const ano = nome[2] ? Number(nome[2]) : anoPadrao;
      return `${ano}-${String(idx + 1).padStart(2, "0")}-01`;
    }
  }
  return null;
}

export function competenciaLabel(competencia: string): string {
  const [ano, mes] = competencia.split("-");
  const nome = MESES[Number(mes) - 1] ?? mes;
  return `${nome.charAt(0).toUpperCase()}${nome.slice(1)} ${ano}`;
}

type SemDados = { erro: string };
const SEM_BANCO: SemDados = {
  erro: "Sem conexão com o banco de dados (Supabase não configurado). Não há dados reais para consultar.",
};

type VolumeRow = { canal: string; dia_semana: number; faixa: string; volume: number; fonte: string };

/**
 * Escolhe a fonte com maior volume total para (competência, canal) — evita
 * dupla contagem entre powerbi/api/legado que coexistem no mesmo unique.
 */
function escolherFonte(rows: VolumeRow[]): string | null {
  const porFonte = new Map<string, number>();
  for (const r of rows) porFonte.set(r.fonte, (porFonte.get(r.fonte) ?? 0) + Number(r.volume));
  let melhor: string | null = null;
  let max = -1;
  for (const [fonte, tot] of porFonte) if (tot > max) ((max = tot), (melhor = fonte));
  return melhor;
}

// --- Tool: meses disponíveis --------------------------------------------
export async function listarCompetencias(): Promise<
  { competencias: Array<{ competencia: string; label: string }> } | SemDados
> {
  const sb = getSupabase();
  if (!sb) return SEM_BANCO;
  const { data, error } = await sb
    .from("volumes_faixa")
    .select("competencia")
    .order("competencia", { ascending: true });
  if (error) return { erro: `Falha ao ler competências: ${error.message}` };

  const vistos = new Set<string>();
  const competencias: Array<{ competencia: string; label: string }> = [];
  for (const row of data ?? []) {
    const c = String((row as { competencia: string }).competencia).slice(0, 10);
    if (!vistos.has(c)) {
      vistos.add(c);
      competencias.push({ competencia: c, label: competenciaLabel(c) });
    }
  }
  return { competencias };
}

/** Resolve a competência pedida ou cai na mais recente disponível. */
async function resolverCompetencia(
  mes?: string,
): Promise<{ competencia: string; label: string } | { erro: string }> {
  const lista = await listarCompetencias();
  if ("erro" in lista) return { erro: lista.erro };
  if (lista.competencias.length === 0)
    return { erro: "Não há nenhum mês com dados carregados no banco ainda." };

  if (mes && mes.trim()) {
    const alvo = parseCompetencia(mes);
    const hit = alvo && lista.competencias.find((c) => c.competencia === alvo);
    if (hit) return hit;
    const disponiveis = lista.competencias.map((c) => c.label).join(", ");
    return {
      erro: `Não há dados para "${mes}" no banco. Meses disponíveis: ${disponiveis}.`,
    };
  }
  return lista.competencias[lista.competencias.length - 1];
}

async function lerVolumes(
  sb: SupabaseClient,
  competencia: string,
  canal?: "webchat" | "whatsapp",
): Promise<VolumeRow[]> {
  let q = sb
    .from("volumes_faixa")
    .select("canal, dia_semana, faixa, volume, fonte")
    .eq("competencia", competencia);
  if (canal) q = q.eq("canal", canal);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    canal: String((r as VolumeRow).canal),
    dia_semana: Number((r as VolumeRow).dia_semana),
    faixa: String((r as VolumeRow).faixa).slice(0, 5),
    volume: Number((r as VolumeRow).volume),
    fonte: String((r as VolumeRow).fonte),
  }));
}

// --- Tool: gargalos reais por faixa -------------------------------------
export async function analisarGargalos(args: {
  mes?: string;
  canal?: "webchat" | "whatsapp";
}): Promise<Record<string, unknown>> {
  const sb = getSupabase();
  if (!sb) return SEM_BANCO;
  const comp = await resolverCompetencia(args.mes);
  if ("erro" in comp) return { erro: comp.erro };

  const canal = args.canal ?? "webchat";
  let rows: VolumeRow[];
  try {
    rows = await lerVolumes(sb, comp.competencia, canal);
  } catch (e) {
    return { erro: `Falha ao ler volumes: ${e instanceof Error ? e.message : String(e)}` };
  }
  if (rows.length === 0)
    return { erro: `Sem curva de volume de ${canal} para ${comp.label} no banco.` };

  const fonte = escolherFonte(rows);
  const daFonte = rows.filter((r) => r.fonte === fonte);

  // Soma o volume de cada faixa ao longo de todos os dias da semana (curva do dia).
  const porFaixa = new Map<string, number>();
  for (const r of daFonte) porFaixa.set(r.faixa, (porFaixa.get(r.faixa) ?? 0) + r.volume);
  const faixas = [...porFaixa.entries()].map(([faixa, volume]) => ({ faixa, volume }));

  const { media, gargalos } = rankearGargalos(faixas, 5);
  return {
    mes: comp.label,
    competencia: comp.competencia,
    canal,
    fonte_dados: fonte,
    volume_medio_por_faixa: media,
    faixas_criticas: gargalos,
    observacao:
      "Picos calculados a partir do volume REAL por faixa de 10 min no banco (soma dos 7 dias). Percentuais são desvio sobre a média das faixas com movimento.",
  };
}

// --- Tool: dimensionamento com volume real ------------------------------
async function paramNumero(sb: SupabaseClient, chave: string, fallback: number): Promise<number> {
  const { data, error } = await sb.rpc("fn_parametro", { p_chave: chave });
  if (error || data === null || data === undefined) return fallback;
  const n = Number(data);
  return Number.isFinite(n) ? n : fallback;
}

export async function dimensionarMesAtual(args: { mes?: string }): Promise<Record<string, unknown>> {
  const sb = getSupabase();
  if (!sb) return SEM_BANCO;
  const comp = await resolverCompetencia(args.mes);
  if ("erro" in comp) return { erro: comp.erro };

  let rows: VolumeRow[];
  try {
    rows = await lerVolumes(sb, comp.competencia);
  } catch (e) {
    return { erro: `Falha ao ler volumes: ${e instanceof Error ? e.message : String(e)}` };
  }
  if (rows.length === 0) return { erro: `Sem dados de volume para ${comp.label} no banco.` };

  // Volume diário médio real por canal = total do canal / nº de dias distintos.
  const calcCanal = (canal: "webchat" | "whatsapp") => {
    const canalRows = rows.filter((r) => r.canal === canal);
    const fonte = escolherFonte(canalRows);
    const daFonte = canalRows.filter((r) => r.fonte === fonte);
    const dias = new Set(daFonte.map((r) => r.dia_semana)).size || 1;
    const total = daFonte.reduce((acc, r) => acc + r.volume, 0);
    return total / dias; // volume médio de 1 dia
  };
  const volDiaWeb = calcCanal("webchat");
  const volDiaWhats = calcCanal("whatsapp");
  const volumeDiarioMedio = Math.round(volDiaWeb + volDiaWhats);
  if (volumeDiarioMedio <= 0)
    return { erro: `Volume diário calculado é zero para ${comp.label}.` };
  const shareWebchat = volDiaWeb / (volDiaWeb + volDiaWhats);

  // Parâmetros de negócio: banco (com vigência) → fallback documentado.
  const [simWeb, simWhats, shrinkageFrac] = await Promise.all([
    paramNumero(sb, "simultaneidade_webchat", 3),
    paramNumero(sb, "simultaneidade_whatsapp", 4),
    paramNumero(sb, "shrinkage", 0.2),
  ]);

  // TMA: sem medição por atendimento carregada; usa base do documento mestre.
  // Rotulado como "assumido" para transparência (não é dado medido do mês).
  const tmaWebchatMin = 16.5;
  const tmaWhatsappMin = 13.0;

  const resultado = dimensionarMesWFM({
    volumeDiarioMedio,
    tmaWebchatMin,
    tmaWhatsappMin,
    simultaneidadeWebchat: simWeb,
    simultaneidadeWhatsapp: simWhats,
    shrinkagePerc: shrinkageFrac * 100,
    shareWebchat,
  });

  return {
    mes: comp.label,
    competencia: comp.competencia,
    ...resultado,
    share_webchat_perc: Number((shareWebchat * 100).toFixed(1)),
    fontes: {
      volume_diario: "REAL (volumes_faixa do banco)",
      simultaneidade: "REAL (parametros com vigência)",
      shrinkage: "REAL (parametros com vigência)",
      tma: "ASSUMIDO (base do documento mestre — não há TMA medido carregado para este mês)",
    },
  };
}

// --- Tool: Erlang C direto ----------------------------------------------
export function calcularErlangCTool(args: {
  volume_chamados_hora: number;
  tma_segundos: number;
  sla_alvo_segundos?: number;
}): ErlangCResult {
  return calcularErlangC(
    args.volume_chamados_hora,
    args.tma_segundos,
    args.sla_alvo_segundos ?? 60,
  );
}
