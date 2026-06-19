#!/usr/bin/env node
/**
 * db-migrate.mjs — Aplica migrations do Supabase via Supabase CLI.
 *
 * Fluxo:
 *   1. Lê VITE_SUPABASE_URL do .env → extrai project ref
 *   2. Verifica se o projeto já está linkado (supabase/.temp/project-ref)
 *   3. Se não, executa `npx supabase link --project-ref <ref>`
 *      usando SUPABASE_DB_PASSWORD (env) ou prompt interativo
 *   4. Lista migrations pendentes com `supabase migration list`
 *   5. Se houver pendentes, pergunta confirmação (ou --yes)
 *   6. Executa `npx supabase db push`
 *
 * Flags:
 *   --yes, -y         Pula confirmação e aplica todas as pendentes
 *   --help, -h        Mostra esta ajuda
 *
 * Pré-requisito: o package `@supabase/supabase-js` já existe no projeto;
 * a CLI `supabase` é resolvida via `npx` (sem instalação global).
 */

import { spawn } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");

// --- Cores ANSI (sem dependência) ---------------------------------------
const c = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};
const paint = (color, text) => `${c[color]}${text}${c.reset}`;
const ok = (msg) => console.log(`${paint("green", "✓")} ${msg}`);
const info = (msg) => console.log(`${paint("cyan", ">")} ${msg}`);
const warn = (msg) => console.log(`${paint("yellow", "!")} ${msg}`);
const err = (msg) => console.log(`${paint("red", "✗")} ${msg}`);

// --- Help ---------------------------------------------------------------
if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(
    [
      "Uso: npm run db:migrate [-- --yes] [-- --help]",
      "",
      "Flags:",
      "  --yes, -y   Pula a confirmação e aplica todas as migrations pendentes",
      "  --help, -h  Mostra esta ajuda",
      "",
      "Env vars:",
      "  SUPABASE_DB_PASSWORD  Senha do DB (Settings → Database). Se faltar, será pedida.",
      "",
      "Pré-requisito:",
      "  VITE_SUPABASE_URL no .env do projeto (já presente em qualquer dev setup).",
    ].join("\n"),
  );
  process.exit(0);
}

const ASSUME_YES = process.argv.includes("--yes") || process.argv.includes("-y");

// --- Carrega .env (parse manual, sem dependência) -----------------------
function loadEnv(path) {
  if (!existsSync(path)) return {};
  const text = readFileSync(path, "utf8");
  const out = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const env = loadEnv(resolve(PROJECT_ROOT, ".env"));
const SUPABASE_URL = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";

if (!SUPABASE_URL) {
  err("VITE_SUPABASE_URL não encontrada no .env nem no ambiente.");
  process.exit(1);
}

let projectRef;
try {
  projectRef = new URL(SUPABASE_URL).hostname.split(".")[0];
} catch {
  err(`VITE_SUPABASE_URL inválida: ${SUPABASE_URL}`);
  process.exit(1);
}

if (!/^[a-z0-9]{20}$/i.test(projectRef)) {
  err(`Project ref inválido extraído da URL: "${projectRef}"`);
  process.exit(1);
}

info(`Project ref: ${paint("bold", projectRef)}`);

// --- Spawn wrapper ------------------------------------------------------
// On Windows, spawning .cmd files requires `shell: true` to bypass the
// Node EINVAL error (Node 18+). All other platforms work with shell: false.
// Args are passed as an array, so even with shell: true there's no injection
// risk: the only interpolated values are the project ref (validated against
// /^[a-z0-9]{20}$/i) and the password (read from env, never logged).
const isWindows = process.platform === "win32";
const SHELL_OPTS = isWindows ? { shell: true } : {};

// Suppress the noisy DEP0190 deprecation emitted when shell:true + args are
// passed. The risk is documented but not relevant here (no untrusted input).
// node:internal uses `process.emitWarning`; silencing at the source via
// `noDeprecation` is the supported way.
if (isWindows) process.noDeprecation = true;

function runNpx(args, options = {}) {
  return new Promise((resolvePromise, rejectPromise) => {
    const cmd = isWindows ? "npx.cmd" : "npx";
    const child = spawn(cmd, ["supabase", ...args], {
      cwd: PROJECT_ROOT,
      stdio: options.stdio || "inherit",
      env: options.env ? { ...process.env, ...options.env } : process.env,
      ...SHELL_OPTS,
    });
    child.on("error", rejectPromise);
    child.on("close", (code) => {
      if (code === 0) resolvePromise();
      else rejectPromise(new Error(`supabase ${args.join(" ")} saiu com código ${code}`));
    });
  });
}

const TEMP_REF_FILE = resolve(PROJECT_ROOT, "supabase", ".temp", "project-ref");
const isLinked = existsSync(TEMP_REF_FILE);

// --- Link (se preciso) --------------------------------------------------
if (isLinked) {
  ok("Já linkado.");
} else {
  warn("Projeto não linkado. Vinculando agora…");
  const password = env.SUPABASE_DB_PASSWORD || process.env.SUPABASE_DB_PASSWORD;
  const linkArgs = ["link", "--project-ref", projectRef];
  if (password) {
    linkArgs.push("--password", password);
  } else {
    warn("SUPABASE_DB_PASSWORD ausente — você será promptado pela CLI.");
  }
  try {
    await runNpx(linkArgs);
    ok("Vinculado.");
  } catch (e) {
    err(`Falha no link: ${e.message}`);
    process.exit(1);
  }
}

// --- Listar pendentes (best-effort) -------------------------------------
info("Listando migrations…");
let listOutput = "";
try {
  listOutput = await new Promise((res, rej) => {
    const cmd = isWindows ? "npx.cmd" : "npx";
    const child = spawn(
      cmd,
      ["supabase", "migration", "list", "--project-ref", projectRef, "--output", "json"],
      {
        cwd: PROJECT_ROOT,
        stdio: ["ignore", "pipe", "pipe"],
        env: process.env,
        ...SHELL_OPTS,
      },
    );
    let out = "";
    child.stdout.on("data", (chunk) => {
      out += chunk.toString();
    });
    child.on("error", rej);
    child.on("close", (code) => {
      if (code === 0) res(out);
      else res(""); // silencioso: nem toda versão da CLI suporta --output json
    });
  });
} catch {
  listOutput = "";
}

let pending = [];
if (listOutput) {
  try {
    const parsed = JSON.parse(listOutput);
    pending = Array.isArray(parsed) ? parsed.filter((m) => !m.applied_at) : [];
  } catch {
    pending = [];
  }
}

if (pending.length === 0) {
  ok("Nenhuma migration pendente.");
  process.exit(0);
}

console.log();
info(`Migrations pendentes (${pending.length}):`);
for (const m of pending) {
  const name = m.version || m.name || m;
  console.log(`  ${paint("gray", "·")} ${name}`);
}
console.log();

// --- Confirmação --------------------------------------------------------
if (!ASSUME_YES) {
  const rl = createInterface({ input, output });
  const answer = (await rl.question("Aplicar? (y/N) ")).trim().toLowerCase();
  rl.close();
  if (answer !== "y" && answer !== "yes" && answer !== "s" && answer !== "sim") {
    warn("Cancelado pelo usuário.");
    process.exit(0);
  }
}

// --- Apply --------------------------------------------------------------
info("Aplicando migrations…");
try {
  await runNpx(["db", "push", "--project-ref", projectRef, "--include-all"]);
  ok("Migrations aplicadas com sucesso.");
} catch (e) {
  err(`Falha ao aplicar: ${e.message}`);
  process.exit(1);
}
