-- ============================================================
-- 004_migracao_dados_legado.sql
-- Migra os dados das tabelas legadas em JSONB (meses, escala_equipe,
-- volumes_chamados, parametros_operacionais) para o schema canônico.
--
-- Segura em qualquer cenário:
--   * Projeto limpo (tabelas legadas não existem) → no-op.
--   * Projeto atual → migra tudo, SEM apagar as tabelas legadas
--     (o front continua funcionando; o drop é uma migration futura,
--     depois da paridade).
--   * Reexecução → idempotente (on conflict do nothing/update).
--
-- Convenções de tradução:
--   Day (front)      → dia_semana ISO: Segunda=1 ... Domingo=7
--   meses.nome       → competencia date ('Fevereiro 2026' → 2026-02-01)
--   capacity_agents  → agentes + capacity_snapshots (origem manual p/ bot|ia)
--   *_volumes JSONB  → volumes_faixa (fonte 'legado_jsonb')
--   team_agents      → agentes + escala_blocos
--   new_hires        → novas_contratacoes
-- ============================================================

create or replace function public._fn_competencia_from_nome(p_nome text)
returns date language sql immutable as $$
  select make_date(
    nullif(regexp_replace(p_nome, '\D', '', 'g'), '')::int,
    case lower(public.fn_unaccent_imm(split_part(trim(p_nome), ' ', 1)))
      when 'janeiro' then 1  when 'fevereiro' then 2 when 'marco' then 3
      when 'abril' then 4    when 'maio' then 5      when 'junho' then 6
      when 'julho' then 7    when 'agosto' then 8    when 'setembro' then 9
      when 'outubro' then 10 when 'novembro' then 11 when 'dezembro' then 12
    end,
    1)
$$;

create or replace function public._fn_dia_iso(p_day text)
returns smallint language sql immutable as $$
  select case lower(public.fn_unaccent_imm(p_day))
    when 'segunda' then 1 when 'terca' then 2 when 'quarta' then 3
    when 'quinta' then 4  when 'sexta' then 5 when 'sabado' then 6
    when 'domingo' then 7 end::smallint
$$;

do $$
declare
  v_mes         record;
  v_comp        date;
  v_row         record;
  v_agente_id   uuid;
  v_tipo        text;
begin
  -- Só roda se o legado existir neste projeto.
  if to_regclass('public.meses') is null then
    raise notice '[004] Tabelas legadas não encontradas — projeto limpo, nada a migrar.';
    return;
  end if;

  for v_mes in select id, nome from public.meses loop
    v_comp := public._fn_competencia_from_nome(v_mes.nome);
    if v_comp is null then
      raise warning '[004] Mês % com nome não reconhecido — pulado.', v_mes.nome;
      continue;
    end if;

    -- --------------------------------------------------------
    -- 1) capacity_agents → agentes + capacity_snapshots
    -- --------------------------------------------------------
    for v_row in
      select ca->>'name' as nome, (ca->>'mediaTri')::numeric as media_tri
      from public.escala_equipe ee,
           jsonb_array_elements(coalesce(ee.capacity_agents, '[]'::jsonb)) ca
      where ee.mes_id = v_mes.id
    loop
      v_tipo := case
        when lower(public.fn_unaccent_imm(v_row.nome)) like '%care%a%i%' then 'ia'
        when lower(public.fn_unaccent_imm(v_row.nome)) like '%yooga suporte%' then 'bot'
        else 'humano' end;

      insert into public.agentes (nome, tipo)
      values (v_row.nome, v_tipo)
      on conflict do nothing;

      select id into v_agente_id from public.agentes
      where lower(public.fn_unaccent_imm(nome)) = lower(public.fn_unaccent_imm(v_row.nome));

      insert into public.capacity_snapshots
        (competencia, agente_id, resolvidos_tri, origem, editado_por)
      values
        (v_comp, v_agente_id, coalesce(v_row.media_tri, 0),
         case when v_tipo = 'humano' then 'freshchat_sync' else 'manual' end,
         'migracao_004')
      on conflict (competencia, agente_id)
        do update set resolvidos_tri = excluded.resolvidos_tri;
    end loop;

    -- --------------------------------------------------------
    -- 2) team_agents.schedules → agentes + escala_blocos
    --    JSONB: [{name, active, schedules: {Day: {intervals: {"HH:MM": status}}}}]
    -- --------------------------------------------------------
    for v_row in
      select ta->>'name' as nome,
             (ta->>'active')::boolean as ativo,
             d.key as dia_nome,
             i.key as bloco,
             i.value #>> '{}' as status
      from public.escala_equipe ee,
           jsonb_array_elements(coalesce(ee.team_agents, '[]'::jsonb)) ta,
           jsonb_each(coalesce(ta->'schedules', '{}'::jsonb)) d,
           jsonb_each(coalesce(d.value->'intervals', '{}'::jsonb)) i
      where ee.mes_id = v_mes.id
        and coalesce(ta->>'isSimulated','false') <> 'true'
    loop
      insert into public.agentes (nome, tipo, ativo)
      values (v_row.nome, 'humano', coalesce(v_row.ativo, true))
      on conflict do nothing;

      select id into v_agente_id from public.agentes
      where lower(public.fn_unaccent_imm(nome)) = lower(public.fn_unaccent_imm(v_row.nome));

      if v_row.status in ('trabalhando','pausa','folga','externo')
         and public._fn_dia_iso(v_row.dia_nome) is not null then
        insert into public.escala_blocos
          (competencia, agente_id, dia_semana, bloco, status)
        values
          (v_comp, v_agente_id, public._fn_dia_iso(v_row.dia_nome),
           v_row.bloco::time, v_row.status)
        on conflict (competencia, agente_id, dia_semana, bloco)
          do update set status = excluded.status;
      end if;
    end loop;

    -- --------------------------------------------------------
    -- 3) webchat_volumes / whatsapp_volumes → volumes_faixa
    --    JSONB: {"HH:MM": {"Segunda": n, ...}}
    -- --------------------------------------------------------
    insert into public.volumes_faixa
      (competencia, canal, dia_semana, faixa, volume, fonte)
    select v_comp, canais.canal, public._fn_dia_iso(d.key), f.key::time,
           coalesce((d.value #>> '{}')::numeric, 0), 'legado_jsonb'
    from public.volumes_chamados vc
    cross join lateral (values
      ('webchat',  vc.webchat_volumes),
      ('whatsapp', vc.whatsapp_volumes)
    ) as canais(canal, blob),
    jsonb_each(coalesce(canais.blob, '{}'::jsonb)) f,
    jsonb_each(f.value) d
    where vc.mes_id = v_mes.id
      and public._fn_dia_iso(d.key) is not null
    on conflict (competencia, canal, dia_semana, faixa, fonte) do nothing;

    -- --------------------------------------------------------
    -- 4) parametros_operacionais → parametros (por competência)
    -- --------------------------------------------------------
    insert into public.parametros (chave, valor, vigencia_inicio, atualizado_por)
    select p.chave, p.valor, v_comp, 'migracao_004'
    from public.parametros_operacionais po
    cross join lateral (values
      ('simultaneidade_webchat',  to_jsonb(po.simultaneous_wc)),
      ('simultaneidade_whatsapp', to_jsonb(po.simultaneous_wa)),
      ('tma_factors_legado',      coalesce(po.tma_factors, 'null'::jsonb)),
      ('cenarios_legado',         coalesce(po.scenarios,   'null'::jsonb))
    ) as p(chave, valor)
    where po.mes_id = v_mes.id
    on conflict (chave, vigencia_inicio) do nothing;

    -- --------------------------------------------------------
    -- 5) new_hires → novas_contratacoes
    -- --------------------------------------------------------
    insert into public.novas_contratacoes
      (competencia, nome, hora_inicio, hora_fim, almoco_inicio,
       dias_semana, ativo, escala_custom)
    select v_comp,
           nh->>'name',
           (nh->>'start_time')::time,
           (nh->>'end_time')::time,
           nullif(nh->>'lunch_start_time','')::time,
           coalesce(array(
             select public._fn_dia_iso(x #>> '{}')
             from jsonb_array_elements(nh->'days') x
           ), '{}'),
           coalesce((nh->>'active')::boolean, true),
           nh->'schedules'
    from public.parametros_operacionais po,
         jsonb_array_elements(coalesce(po.new_hires, '[]'::jsonb)) nh
    where po.mes_id = v_mes.id
      and not exists (
        select 1 from public.novas_contratacoes nc
        where nc.competencia = v_comp and nc.nome = nh->>'name'
      );

    raise notice '[004] Mês % (%) migrado.', v_mes.nome, v_comp;
  end loop;
end $$;

-- As funções auxiliares ficam (são úteis para reprocessos); as tabelas
-- legadas NÃO são dropadas — isso é uma migration futura, pós-paridade.
