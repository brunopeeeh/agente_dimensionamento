import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { handleSyncCapacity } from "./lib/api/sync-capacity.server";
import type { SyncCapacityBody } from "./lib/api/sync-capacity.server";

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

  // POST /api/sync-capacity — called by n8n to update capacity agents
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
      return new Response(
        JSON.stringify({ success: false, error: message }),
        { status: 400, headers: API_HEADERS },
      );
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
