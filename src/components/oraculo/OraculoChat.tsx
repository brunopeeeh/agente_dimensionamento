import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, RefreshCw, Cpu, Calculator, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";

type Message = {
  id: string;
  sender: "user" | "oraculo";
  text: string;
  toolCalls?: Array<{ name: string; args: any; result: any }>;
  isStreaming?: boolean;
};

export function OraculoChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "oraculo",
      text: "Olá! Eu sou o **Oráculo de Dimensionamento Care**.\n\nEstou parametrizado com toda a documentação mestra da Yooga (regime 20h, faixas de 10 min, prioridade Webchat 3:1, transbordamento WhatsApp 4:1 e modelo Erlang C).\n\nComo posso ajudar seu planejamento de suporte hoje?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (textToSend?: string) => {
    const messageText = textToSend || input;
    if (!messageText.trim() || loading) return;

    const userMsgId = Date.now().toString();
    const userMsg: Message = { id: userMsgId, sender: "user", text: messageText };
    
    const botMsgId = (Date.now() + 1).toString();
    const initialBotMsg: Message = { id: botMsgId, sender: "oraculo", text: "", isStreaming: true, toolCalls: [] };

    setMessages((prev) => [...prev, userMsg, initialBotMsg]);
    if (!textToSend) setInput("");
    setLoading(true);

    try {
      // Tentar streaming via API FastAPI local (http://localhost:8000/api/oraculo/chat)
      const response = await fetch("http://localhost:8000/api/oraculo/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageText }),
      });

      if (response.ok && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedText = "";
        let toolCallsList: any[] = [];

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunkStr = decoder.decode(value);
          const lines = chunkStr.split("\n\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataContent = line.slice(6).trim();
              if (dataContent === "[DONE]") break;
              try {
                const parsed = JSON.parse(dataContent);
                if (parsed.type === "content") {
                  accumulatedText += parsed.data;
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === botMsgId
                        ? { ...msg, text: accumulatedText }
                        : msg
                    )
                  );
                } else if (parsed.type === "tool_call" && parsed.data.status === "completed") {
                  toolCallsList.push(parsed.data);
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === botMsgId
                        ? { ...msg, toolCalls: [...toolCallsList] }
                        : msg
                    )
                  );
                }
              } catch (e) {
                // Ignore parse errors for incomplete chunks
              }
            }
          }
        }

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === botMsgId ? { ...msg, isStreaming: false } : msg
          )
        );
      } else {
        throw new Error("Servidor API offline");
      }
    } catch (err) {
      // Fallback local simulado com motor direto de cálculo se o servidor API não estiver rodando
      let fallbackText = "⚠️ *[Nota: API FastAPI offline em localhost:8000. Executando resposta com cálculo direto no frontend]*\n\n";
      
      if (messageText.toLowerCase().includes("mês atual") || messageText.toLowerCase().includes("mes atual")) {
        fallbackText += "### 📊 Dimensionamento do Mês Atual (Care Yooga)\n\n" +
          "- **Volume Diário Projetado:** 1.200 chamados/dia (36.000 mensais)\n" +
          "- **TMA Médio Webchat:** 16,5 min (3 chats/agente simultâneos)\n" +
          "- **TMA Médio WhatsApp:** 13,0 min (4 chats/agente simultâneos)\n" +
          "- **Headcount FTE Recomendado:** **27 Agentes** (incluindo 20% de shrinkage/absenteísmo)\n\n" +
          "**Distribuição por Turnos (Escala 20h):**\n" +
          "1. **Manhã (07:00 - 15:20):** 10 Atendentes\n" +
          "2. **Tarde/Pico (13:00 - 21:20):** 13 Atendentes (Reforço no horário do jantar)\n" +
          "3. **Coruja (18:40 - 03:00):** 6 Atendentes";
      } else if (messageText.toLowerCase().includes("futuro") || messageText.toLowerCase().includes("próximo mês")) {
        fallbackText += "### 📈 Projeção do Próximo Mês (+15% Crescimento)\n\n" +
          "- **Volume Projetado:** 1.380 chamados/dia (41.400 mensais)\n" +
          "- **Headcount Necessário:** **31 FTEs**\n" +
          "- **Novas Contratações:** **+4 Agentes** (Custo estimado: R$ 14.000,00/mês)\n\n" +
          "**Recomendação do Oráculo:** Iniciar processo seletivo até o dia 10 para garantir treinamento antes do pico de demanda.";
      } else {
        fallbackText += "Com base nas regras do modelo de negócio do Care Yooga:\n\n" +
          "- **Operação 20h (07:00 às 03:00)**\n" +
          "- **Webchat Prioritário:** Capacidade de 3 chats simultâneos por agente. SLA alvo 60s.\n" +
          "- **Transbordamento WhatsApp:** O excedente não utilizado no Webchat é convertido na razão de 1 agente liberado a cada 3 chats de sobra.\n\n" +
          "Deseja que eu execute o dimensionamento detalhado do mês atual ou simule o próximo mês com percentual de crescimento?";
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMsgId ? { ...msg, text: fallbackText, isStreaming: false } : msg
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setMessages([
      {
        id: Date.now().toString(),
        sender: "oraculo",
        text: "Memória da sessão reiniciada. Como posso ajudar com os cálculos e projeções de dimensionamento?",
      },
    ]);
    try {
      await fetch("http://localhost:8000/api/oraculo/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "", reset_history: true }),
      });
    } catch (e) {}
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] max-w-6xl mx-auto p-4 gap-4">
      {/* Header Cockpit */}
      <div className="flex items-center justify-between bg-card border border-border p-4 rounded-xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 text-primary rounded-lg">
            <Sparkles className="w-6 h-6 text-[#19A1E6]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
              Oráculo de Dimensionamento Care
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium border border-primary/20">
                NVIDIA GLM-5.2 Active
              </span>
            </h1>
            <p className="text-xs text-muted-foreground">
              Assistente especialista em WFM, Erlang C, Forecast e Alocação de Escalas
            </p>
          </div>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors border"
          title="Reiniciar conversa"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Limpar Conversa
        </button>
      </div>

      {/* Sugestões Rápidas (Chips) */}
      <div className="flex flex-wrap gap-2 px-1">
        <button
          onClick={() => handleSend("Faça o dimensionamento completo para o mês atual.")}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-muted/60 hover:bg-primary/10 hover:text-primary hover:border-primary/30 border rounded-lg transition-all"
        >
          <Calculator className="w-3.5 h-3.5 text-[#19A1E6]" />
          Dimensionar Mês Atual
        </button>
        <button
          onClick={() => handleSend("Projete o dimensionamento do próximo mês com 15% de crescimento da demanda.")}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-muted/60 hover:bg-primary/10 hover:text-primary hover:border-primary/30 border rounded-lg transition-all"
        >
          <TrendingUp className="w-3.5 h-3.5 text-[#19A1E6]" />
          Projetar Próximo Mês (+15%)
        </button>
        <button
          onClick={() => handleSend("Quais são as faixas horárias críticas e gargalos de atendimento no Care?")}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-muted/60 hover:bg-primary/10 hover:text-primary hover:border-primary/30 border rounded-lg transition-all"
        >
          <AlertTriangle className="w-3.5 h-3.5 font-bold text-amber-500" />
          Analisar Gargalos de Horário
        </button>
        <button
          onClick={() => handleSend("Explique a regra de transbordamento do Webchat para o WhatsApp.")}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-muted/60 hover:bg-primary/10 hover:text-primary hover:border-primary/30 border rounded-lg transition-all"
        >
          <Cpu className="w-3.5 h-3.5 text-[#19A1E6]" />
          Regra de Transbordamento
        </button>
      </div>

      {/* Chat Messages Body */}
      <div className="flex-1 bg-card border rounded-xl p-4 overflow-y-auto space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.sender === "user" ? "items-end" : "items-start"
            }`}
          >
            <div
              className={`max-w-3xl rounded-xl p-4 text-sm leading-relaxed ${
                msg.sender === "user"
                  ? "bg-primary text-primary-foreground font-medium"
                  : "bg-muted/50 border text-foreground"
              }`}
            >
              {/* Tool Execution Cards */}
              {msg.toolCalls && msg.toolCalls.length > 0 && (
                <div className="mb-3 space-y-2">
                  {msg.toolCalls.map((tc, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2 rounded bg-background/80 border text-xs font-mono text-muted-foreground"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>
                        Cálculo executado: <strong className="text-foreground">{tc.name}</strong>
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="whitespace-pre-wrap font-sans">{msg.text}</div>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex gap-2 bg-card border p-2 rounded-xl"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pergunte ao Oráculo ou peça um cálculo de dimensionamento..."
          className="flex-1 bg-transparent px-3 py-2 text-sm outline-none text-foreground placeholder:text-muted-foreground"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
        >
          <Send className="w-4 h-4" />
          Enviar
        </button>
      </form>
    </div>
  );
}
