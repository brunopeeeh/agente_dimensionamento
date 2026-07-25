import process from "node:process";

/**
 * Guardas das rotas /api/* (ver src/server.ts).
 *
 * Contexto: o app não tem login. Sem estas checagens, qualquer origem podia
 * chamar os endpoints e gastar as chaves NVIDIA/OpenRouter/Freshchat/HubSpot,
 * além de escrever no Supabase com a SERVICE_ROLE_KEY (que bypassa RLS).
 */

/**
 * Bloqueia requisição de browser vinda de outro site.
 *
 * A UI chama os endpoints por URL relativa, então `Origin` bate com o host.
 * Requisição sem `Origin` (n8n, curl, server-to-server) passa aqui — é o
 * `x-api-key` que protege a rota sensível.
 */
export function isCrossSite(request: Request, url: URL): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  return origin !== url.origin && origin !== process.env.APP_ORIGIN;
}

/**
 * Segredo compartilhado para as rotas chamadas pelo n8n.
 *
 * Falha fechado: sem `API_SHARED_SECRET` no ambiente, nega tudo. Deploy sem a
 * variável quebra o sync de forma visível em vez de ficar aberto em silêncio.
 */
export function hasValidApiKey(request: Request): boolean {
  const expected = process.env.API_SHARED_SECRET;
  if (!expected) return false;
  return request.headers.get("x-api-key") === expected;
}
