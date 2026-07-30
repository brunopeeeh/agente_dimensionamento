/**
 * Cliente do Oráculo (browser). Consome o stream SSE de POST /api/oraculo/chat
 * (mesma origem, Vercel-native) e entrega conteúdo + tool calls. Usado tanto
 * pelo chat cheio quanto pelo widget flutuante — Oráculo único.
 */
export type OraculoToolCall = { name: string; result: unknown };

export async function streamOraculo(
  input: {
    message: string;
    history?: Array<{ role: "user" | "assistant"; content: string }>;
    pageContext?: Record<string, unknown>;
  },
  handlers?: {
    onContent?: (fullText: string, delta: string) => void;
    onToolCall?: (toolCalls: OraculoToolCall[]) => void;
  },
): Promise<{ text: string; toolCalls: OraculoToolCall[] }> {
  const response = await fetch("/api/oraculo/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok || !response.body) {
    throw new Error(`Oráculo indisponível (HTTP ${response.status}).`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  const toolCalls: OraculoToolCall[] = [];

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") continue;
      try {
        const parsed = JSON.parse(payload) as
          | { type: "content"; data: string }
          | { type: "tool_call"; data: { name: string; result: unknown } };
        if (parsed.type === "content") {
          text += parsed.data;
          handlers?.onContent?.(text, parsed.data);
        } else if (parsed.type === "tool_call") {
          toolCalls.push({ name: parsed.data.name, result: parsed.data.result });
          handlers?.onToolCall?.([...toolCalls]);
        }
      } catch {
        /* chunk parcial */
      }
    }
  }

  return { text, toolCalls };
}
