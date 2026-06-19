#!/usr/bin/env node
/**
 * db-link.mjs — Vincula o repositório local ao projeto Supabase remoto.
 * Idempotente: se já linkado, sai com sucesso.
 */

import { spawn } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");

const c = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
};
const paint = (color, text) => `${c[color]}${text}${c.reset}`;
const ok = (m) => console.log(`${paint("green", "✓")} ${m}`);
const warn = (m) => console.log(`${paint("yellow", "!")} ${m}`);
const err = (m) => console.log(`${paint("red", "✗")} ${m}`);
const info = (m) => console.log(`${paint("cyan", ">")} ${m}`);

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
const url = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
if (!url) {
  err("VITE_SUPABASE_URL ausente no .env.");
  process.exit(1);
}
const ref = new URL(url).hostname.split(".")[0];
info(`Project ref: ${ref}`);

const tempFile = resolve(PROJECT_ROOT, "supabase", ".temp", "project-ref");
if (existsSync(tempFile)) {
  ok("Já linkado.");
  process.exit(0);
}

const password = env.SUPABASE_DB_PASSWORD || process.env.SUPABASE_DB_PASSWORD || "";
const args = ["link", "--project-ref", ref];
if (password) args.push("--password", password);
else warn("SUPABASE_DB_PASSWORD ausente — a CLI vai pedir.");

// Suppress DEP0190 (shell:true + args concat) on Windows.
if (process.platform === "win32") process.noDeprecation = true;

await new Promise((resolveP, rejectP) => {
  const isWin = process.platform === "win32";
  const child = spawn(isWin ? "npx.cmd" : "npx", ["supabase", ...args], {
    cwd: PROJECT_ROOT,
    stdio: "inherit",
    env: process.env,
    shell: isWin,
  });
  child.on("close", (code) => (code === 0 ? resolveP() : rejectP(new Error(`exit ${code}`))));
  child.on("error", rejectP);
});

ok("Vinculado.");
