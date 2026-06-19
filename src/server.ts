import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { handleSyncCapacity } from "./lib/api/sync-capacity.server";
import type { SyncCapacityBody } from "./lib/api/sync-capacity.server";
import { runFreshchatSync } from "./lib/api/freshchat.server";
import type { FreshchatSyncResult } from "./lib/api/freshchat.server";
import { runAiSuggestion } from "./lib/api/ai-agent.server";
import type { AiSuggestionRequest, AiSuggestionResponse } from "./lib/api/ai-agent.server";
import { runMathSuggestion } from "./lib/optimization/solver";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

const API_HEADERS = {
  "content-type": "application/json",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
};

// Handle custom API routes before delegating to TanStack Start SSR
async function handleApiRoutes(request: Request): Promise<Response | null> {
  const url = new URL(request.url);

  // POST /api/sync-capacity — manually invoked or proxied from /api/sync-from-freshchat
  if (url.pathname === "/api/sync-capacity") {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: API_HEADERS });
    }

    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({ success: false, error: "Method not allowed. Use POST." }),
        { status: 405, headers: API_HEADERS },
      );
    }

    try {
      const body = (await request.json()) as SyncCapacityBody;
      const result = await handleSyncCapacity(body);
      return new Response(JSON.stringify(result.data), {
        status: result.status,
        headers: API_HEADERS,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao processar requisição.";
      return new Response(JSON.stringify({ success: false, error: message }), {
        status: 400,
        headers: API_HEADERS,
      });
    }
  }

  // POST /api/sync-from-freshchat — called by the /capacidade UI button.
  // Triggers an end-to-end Freshchat → Supabase sync for the given month.
  if (url.pathname === "/api/sync-from-freshchat") {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: API_HEADERS });
    }

    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Method not allowed. Use POST.",
          month: "",
          agents_synced: 0,
          agents_added_to_team: [],
          agents_removed_from_team: [],
          total_team_agents: 0,
          error: "METHOD_NOT_ALLOWED",
        }),
        { status: 405, headers: API_HEADERS },
      );
    }

    try {
      const body = (await request.json()) as { month?: string; teamAgentNames?: string[] };
      const result: FreshchatSyncResult = await runFreshchatSync({
        month: body.month || "",
        teamAgentNames: Array.isArray(body.teamAgentNames) ? body.teamAgentNames : [],
      });
      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 500,
        headers: API_HEADERS,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao sincronizar com Freshchat.";
      const errorBody: FreshchatSyncResult = {
        success: false,
        message: `Falha no sync: ${message}`,
        month: "",
        agents_synced: 0,
        agents_added_to_team: [],
        agents_removed_from_team: [],
        total_team_agents: 0,
        error: message,
      };
      return new Response(JSON.stringify(errorBody), {
        status: 500,
        headers: API_HEADERS,
      });
    }
  }

  // POST /api/ai-suggestion — OpenRouter-powered hiring suggestions
  if (url.pathname === "/api/ai-suggestion") {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: API_HEADERS });
    }

    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Method not allowed. Use POST.",
          month: "",
          cached: false,
          attempts: 0,
          agents: [],
          model: "",
          generatedAt: new Date().toISOString(),
        } satisfies AiSuggestionResponse),
        { status: 405, headers: API_HEADERS },
      );
    }

    try {
      const body = (await request.json()) as AiSuggestionRequest;
      const result = await runAiSuggestion(body);
      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 422,
        headers: API_HEADERS,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao gerar sugestão.";
      const errorBody: AiSuggestionResponse = {
        success: false,
        message: `Falha: ${message}`,
        month: "",
        cached: false,
        attempts: 0,
        agents: [],
        model: "",
        generatedAt: new Date().toISOString(),
      };
      return new Response(JSON.stringify(errorBody), {
        status: 500,
        headers: API_HEADERS,
      });
    }
  }

  // POST /api/math-suggestion — Mathematical Optimization (Operations Research)
  if (url.pathname === "/api/math-suggestion") {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: API_HEADERS });
    }

    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Method not allowed. Use POST.",
          month: "",
          cached: false,
          attempts: 0,
          agents: [],
          model: "",
          generatedAt: new Date().toISOString(),
        } satisfies AiSuggestionResponse),
        { status: 405, headers: API_HEADERS },
      );
    }

    try {
      const body = (await request.json()) as AiSuggestionRequest;
      const result = runMathSuggestion(body); // Synchronous
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: API_HEADERS,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao gerar otimização matemática.";
      const errorBody: AiSuggestionResponse = {
        success: false,
        message: `Falha: ${message}`,
        month: "",
        cached: false,
        attempts: 0,
        agents: [],
        model: "",
        generatedAt: new Date().toISOString(),
      };
      return new Response(JSON.stringify(errorBody), {
        status: 500,
        headers: API_HEADERS,
      });
    }
  }

  return null; // Not an API route — delegate to TanStack Start
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      // Check custom API routes first
      const apiResponse = await handleApiRoutes(request);
      if (apiResponse) return apiResponse;

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
