-- 002_calculadora_anual.sql — plano anual de headcount (Calculadora Anual)
-- Uma linha por plano, chaveada por nome ('principal' hoje; cenários nomeados no futuro).
-- Não é chaveada por mes_id de propósito: o forecast é anual e independente do
-- ciclo de vida dos meses operacionais.

create table if not exists public.calculadora_anual (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  scenario_key text not null default 'base',
  inputs jsonb not null,
  sources jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.calculadora_anual enable row level security;

-- Mesmo modelo de acesso do resto do app (anon key lê e escreve)
drop policy if exists "calculadora_anual_select_all" on public.calculadora_anual;
create policy "calculadora_anual_select_all" on public.calculadora_anual
  for select to anon, authenticated using (true);

drop policy if exists "calculadora_anual_insert_all" on public.calculadora_anual;
create policy "calculadora_anual_insert_all" on public.calculadora_anual
  for insert to anon, authenticated with check (true);

drop policy if exists "calculadora_anual_update_all" on public.calculadora_anual;
create policy "calculadora_anual_update_all" on public.calculadora_anual
  for update to anon, authenticated using (true) with check (true);
