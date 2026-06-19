-- 001_ai_sugestoes.sql
-- Cache de 24h das sugestões do agente de IA (Phase 3).
-- A chave de cache é (month, input_hash), permitindo que meses com tabelas de
-- defasagem idênticas reutilizem a mesma sugestão.
--
-- Rode este script no Supabase SQL Editor do seu projeto Yooga antes de
-- habilitar o botão "Gerar Sugestão IA" no /painel.

create table if not exists public.ai_sugestoes (
  id uuid primary key default gen_random_uuid(),
  month text not null,                 -- ex: 'Fevereiro 2026'
  input_hash text not null,            -- sha256(month + JSON.stringify(deficitTable))
  agents jsonb not null,               -- [{agente, inicio, fim, dias_trabalho, folga}, ...]
  justification text,                  -- reasoning behind hourly shifts
  model text not null,                 -- ex: 'openai/gpt-4o-mini'
  generated_at timestamptz not null default now(),
  validation_errors jsonb,             -- null quando válido; senão array de {rule, agent?, message}
  created_at timestamptz not null default now()
);

create index if not exists ai_sugestoes_month_idx
  on public.ai_sugestoes (month);

create index if not exists ai_sugestoes_lookup_idx
  on public.ai_sugestoes (month, input_hash, generated_at desc);

-- RLS: leitura pública (igual ao resto do app, que usa a anon key).
-- Escrita apenas via service role no servidor (nunca habilite a anon key para INSERT).
alter table public.ai_sugestoes enable row level security;

drop policy if exists "ai_sugestoes_select_all" on public.ai_sugestoes;
create policy "ai_sugestoes_select_all"
  on public.ai_sugestoes
  for select
  to anon, authenticated
  using (true);

drop policy if exists "ai_sugestoes_insert_all" on public.ai_sugestoes;
create policy "ai_sugestoes_insert_all"
  on public.ai_sugestoes
  for insert
  to anon, authenticated
  with check (true);
