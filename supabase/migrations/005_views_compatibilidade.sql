-- ============================================================
-- 005_views_compatibilidade.sql
-- 1) Views que remontam o formato JSONB que o front atual espera —
--    permitem trocar a leitura do app para o schema novo SEM reescrever
--    componentes (a escrita migra depois, tela a tela).
-- 2) Primeira view de cálculo: volume médio por faixa com contagem REAL
--    de ocorrências do dia da semana (mata o "÷13" fixo).
-- ============================================================

-- Helper: dia ISO → nome usado pelo front
create or replace function public._fn_dia_nome(p_iso smallint)
returns text language sql immutable as $$
  select (array['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'])[p_iso]
$$;

-- ------------------------------------------------------------
-- 1a. Volumes no formato Record<"HH:MM", Record<Day, number>>
--     (equivalente a volumes_chamados.webchat_volumes / whatsapp_volumes)
-- ------------------------------------------------------------
create or replace view public.v_volumes_json as
select
  vf.competencia,
  vf.canal,
  vf.fonte,
  jsonb_object_agg(
    to_char(vf.faixa, 'HH24:MI'),
    vf.obj
    order by vf.faixa
  ) as volumes
from (
  select competencia, canal, fonte, faixa,
         jsonb_object_agg(public._fn_dia_nome(dia_semana), volume) as obj
  from public.volumes_faixa
  group by competencia, canal, fonte, faixa
) vf
group by vf.competencia, vf.canal, vf.fonte;

-- ------------------------------------------------------------
-- 1b. Capacity no formato CapacityAgent[] ({name, mediaTri})
-- ------------------------------------------------------------
create or replace view public.v_capacity_json as
select
  cs.competencia,
  jsonb_agg(
    jsonb_build_object('name', a.nome, 'mediaTri', cs.resolvidos_tri)
    order by cs.resolvidos_tri desc
  ) as capacity_agents
from public.capacity_snapshots cs
join public.agentes a on a.id = cs.agente_id
group by cs.competencia;

-- ------------------------------------------------------------
-- 1c. Escala no formato TeamAgent[] (schedules por Day/intervals)
-- ------------------------------------------------------------
create or replace view public.v_escala_json as
with blocos as (
  select eb.competencia, eb.agente_id, eb.dia_semana,
         jsonb_object_agg(to_char(eb.bloco,'HH24:MI'), eb.status order by eb.bloco) as intervals
  from public.escala_blocos eb
  group by eb.competencia, eb.agente_id, eb.dia_semana
),
dias as (
  select b.competencia, b.agente_id,
         jsonb_object_agg(
           public._fn_dia_nome(b.dia_semana),
           jsonb_build_object('intervals', b.intervals)
         ) as schedules
  from blocos b
  group by b.competencia, b.agente_id
)
select
  d.competencia,
  jsonb_agg(
    jsonb_build_object(
      'id', a.id, 'name', a.nome, 'active', a.ativo, 'schedules', d.schedules
    ) order by a.nome
  ) as team_agents
from dias d
join public.agentes a on a.id = d.agente_id
where a.tipo = 'humano'
group by d.competencia;

-- ------------------------------------------------------------
-- 2. Motor de cálculo — view 1: volume médio por faixa a partir dos
--    atendimentos canônicos, ponderado pela contagem REAL de ocorrências
--    de cada dia da semana no período.
--
--    Uso (ex.: trimestre pré-migração HubSpot):
--      select * from public.fn_volume_medio_faixa(
--        '2026-03-01', '2026-05-31', 'freshchat');
--
--    Substitui o export do Power BI + divisão por 13 quando a ingestão
--    via API estiver ativa. Enquanto isso, serve à PoC de reconciliação
--    (comparar com volumes_faixa fonte 'powerbi_upload').
-- ------------------------------------------------------------
create or replace function public.fn_volume_medio_faixa(
  p_inicio date,
  p_fim    date,
  p_fonte  text default null,
  p_canal  text default null
)
returns table (
  canal       text,
  dia_semana  smallint,
  faixa       time,
  ocorrencias integer,   -- quantas vezes o dia apareceu no período (12 ou 13!)
  total       bigint,
  volume_medio numeric
)
language sql stable as $$
  with ocorr as (
    -- contagem real de cada dia da semana no período
    select extract(isodow from d)::smallint as dia_semana, count(*)::int as n
    from generate_series(p_inicio, p_fim, interval '1 day') d
    group by 1
  ),
  fatos as (
    select
      a.canal,
      extract(isodow from a.created_at at time zone 'America/Sao_Paulo')::smallint as dia_semana,
      -- faixa de 10 min no fuso local (UTC desloca a madrugada p/ outro dia!)
      date_trunc('hour', a.created_at at time zone 'America/Sao_Paulo')::time
        + make_interval(mins => (extract(minute from a.created_at at time zone 'America/Sao_Paulo')::int / 10) * 10)
        as faixa,
      count(*) as total
    from public.atendimentos a
    where a.created_at >= p_inicio
      and a.created_at < p_fim + 1
      and (p_fonte is null or a.fonte = p_fonte)
      and (p_canal is null or a.canal = p_canal)
    group by 1, 2, 3
  )
  select f.canal, f.dia_semana, f.faixa, o.n, f.total,
         round(f.total::numeric / o.n, 4) as volume_medio
  from fatos f
  join ocorr o using (dia_semana)
  order by f.canal, f.dia_semana, f.faixa;
$$;

comment on function public.fn_volume_medio_faixa is
  'Curva de volume por faixa de 10 min com ponderação pela contagem real de  dias no período (corrige o viés de até ~8% da divisão fixa por 13).  Fuso America/Sao_Paulo aplicado antes do bucketing — o Freshchat grava  em UTC e sem a conversão a madrugada cai no dia errado.';
