-- ============================================================
-- 003_seed_parametros.sql
-- Seed de parâmetros de negócio e agentes sintéticos.
-- Tira do código (freshchat.server.ts / constants.ts) tudo o que é
-- configuração de negócio. Idempotente: on conflict do nothing.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Agentes sintéticos (preenchimento manual, decisão operacional atual)
-- ------------------------------------------------------------
insert into public.agentes (nome, tipo, ativo)
values
  ('Yooga Suporte', 'bot', true),   -- usuário compartilhado: supervisores + N2
  ('Care AI',       'ia',  true)
on conflict do nothing;

-- ------------------------------------------------------------
-- 2. Parâmetros operacionais (valores atuais do código/planilha)
-- ------------------------------------------------------------
insert into public.parametros (chave, valor, vigencia_inicio, atualizado_por)
values
  -- Capacidade simultânea por canal (DEFAULT_SIMULTANEOUS_* no front)
  ('simultaneidade_webchat',  to_jsonb(3), '2026-01-01', 'seed'),
  ('simultaneidade_whatsapp', to_jsonb(4), '2026-01-01', 'seed'),

  -- Shrinkage explícito (novo — o modelo da planilha assumia 480 min líquidos)
  ('shrinkage', to_jsonb(0.20), '2026-01-01', 'seed'),

  -- Base de operação dos agentes sintéticos (correção do bug de 480min:
  -- Care AI opera ~20h x 30 dias, não 8h x 20 dias úteis)
  ('care_ai_horas_dia',        to_jsonb(20), '2026-01-01', 'seed'),
  ('care_ai_dias_mes',         to_jsonb(30), '2026-01-01', 'seed'),
  ('yooga_suporte_horas_dia',  to_jsonb(12), '2026-01-01', 'seed'),
  ('yooga_suporte_dias_mes',   to_jsonb(26), '2026-01-01', 'seed'),

  -- Grupos Freshchat (antes hardcoded em freshchat.server.ts).
  -- ATENÇÃO: incluir o group_id do WhatsApp quando confirmado — hoje o
  -- sync filtra só Retenção+Webchat e ignora agentes exclusivos de WhatsApp.
  ('freshchat_grupos', jsonb_build_object(
      'retencao',   '3ea40078-55f2-4176-85ee-face7f3d7498',
      'webchat',    '6b748002-634a-4ba7-b191-844d123643ed',
      'onboarding', '64f40e5f-b18a-4d1d-8c23-1fcb9575c5a7',
      'whatsapp',   null
   ), '2026-01-01', 'seed'),

  -- Overrides de sync (antes EXCLUDE_NAMES / RENAME_MAP no código)
  ('freshchat_sync_excluir',  jsonb_build_array('Maya Santos'), '2026-01-01', 'seed'),
  ('freshchat_sync_renomear', jsonb_build_object('Yooga Tecnologia', 'Care IA'), '2026-01-01', 'seed'),

  -- Marco da migração de plataforma: toda view de tendência corta aqui.
  -- Volume pós-marco em fonte única SUBDIMENSIONA (chamados divididos
  -- entre Freshchat e HubSpot). Forecast usa meses pré-marco até a soma
  -- das duas fontes estar disponível.
  ('migracao_hubspot_inicio', to_jsonb('2026-06-01'::text), '2026-01-01', 'seed'),

  -- Jornada
  ('jornada_horas_dia',    to_jsonb(8),  '2026-01-01', 'seed'),
  ('dias_uteis_mes',       to_jsonb(20), '2026-01-01', 'seed'),
  ('meses_por_trimestre',  to_jsonb(3),  '2026-01-01', 'seed')
on conflict (chave, vigencia_inicio) do nothing;
