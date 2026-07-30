import { useState, useRef, useEffect } from "react";
import { useLocation } from "@tanstack/react-router";
import { Sparkles, X, Send, RefreshCw, Bot, Calculator, TrendingUp, AlertTriangle, Activity } from "lucide-react";
import { useDimensionamento } from "@/context/DimensionamentoContext";
import { processOraculoChat, type PageContext } from "@/lib/api/oraculo-service";

export function OraculoWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ id: string; sender: "user" | "oraculo"; text: string }>>([
    {
      id: "welcome",
      sender: "oraculo",
      text: "Olá! Eu sou o **Oráculo de Dimensionamento Care**.\n\nEstou conectado aos dados do seu cockpit. Clique em **'Analisar Dados da Tela'** ou faça uma pergunta sobre WFM, Erlang C e contratações!",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const location = useLocation();
  const dimensionamentoContext = useDimensionamento();

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Extrai dados da tela atual
  const getPageContext = (): PageContext => {
    const activeAgentsCount = dimensionamentoContext?.teamAgents?.length || 0;
    const totalDeficit10 = dimensionamentoContext?.kpis?.totalDeficit10 || 0;
    const webchatVolume = dimensionamentoContext?.kpis?.webchatVolume || 0;
    const whatsappVolume = dimensionamentoContext?.kpis?.whatsappVolume || 0;
    const coberturaProjetada = dimensionamentoContext?.kpis?.coberturaProjetada || 100;

    return {
      currentPath: location.pathname,
      activeAgentsCount,
      totalDeficit10,
      webchatVolume,
      whatsappVolume,
      coberturaProjetada,
    };
  };

  const handleSend = async (customText?: string) => {
    const textToSend = customText || input;
    if (!textToSend.trim() || loading) return;

    const userMsg = { id: Date.now().toString(), sender: "user" as const, text: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    if (!customText) setInput("");
    setLoading(true);

    try {
      const pageContext = getPageContext();
      const responseText = await processOraculoChat(textToSend, [], pageContext);

      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), sender: "oraculo", text: responseText },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "oraculo",
          text: "⚠️ Ocorreu um erro ao consultar o Oráculo. Tente novamente.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeScreen = () => {
    const ctx = getPageContext();
    const prompt = `Analise os dados atuais da tela ${ctx.currentPath}. Atualmente temos ${ctx.activeAgentsCount} agentes na equipe e um déficit de ${ctx.totalDeficit10} chats. Qual é o diagnóstico e sugestão de ajuste?`;
    handleSend(prompt);
  };

  return (
    <>
      {/* Botão Flutuante (Floating Trigger Button) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-[#19A1E6] hover:bg-[#1587C2] text-white rounded-full shadow-2xl hover:scale-105 transition-all duration-200 cursor-pointer font-medium text-sm group"
          title="Abrir Oráculo IA de Dimensionamento"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full ring-2 ring-white"></span>
          </div>
          <span className="hidden sm:inline font-bold">Oráculo IA</span>
        </button>
      )}

      {/* Floating Chat Drawer */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[92vw] sm:w-[420px] h-[580px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between bg-card border-b p-3.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-primary/10 text-primary rounded-lg">
                <Bot className="w-5 h-5 text-[#19A1E6]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  Oráculo Care
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  IA em Produção ({location.pathname})
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() =>
                  setMessages([
                    {
                      id: Date.now().toString(),
                      sender: "oraculo",
                      text: "Memória da conversa limpa. Como posso ajudar com os dados da sua tela?",
                    },
                  ])
                }
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted"
                title="Limpar conversa"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted"
                title="Fechar Oráculo"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Context Banner */}
          <div className="bg-primary/5 border-b px-3.5 py-2 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Activity className="w-3.5 h-3.5 text-[#19A1E6]" />
              <span>Tela atual: <strong className="text-foreground">{location.pathname}</strong></span>
            </div>
            <button
              onClick={handleAnalyzeScreen}
              disabled={loading}
              className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              Analisar Dados
            </button>
          </div>

          {/* Quick Chips */}
          <div className="flex gap-1.5 p-2 overflow-x-auto border-b bg-muted/20 text-xs no-scrollbar">
            <button
              onClick={() => handleSend("Faça o dimensionamento completo para o mês atual.")}
              className="px-2.5 py-1 bg-card border rounded-md whitespace-nowrap hover:border-primary/50 text-[11px] font-medium flex items-center gap-1"
            >
              <Calculator className="w-3 h-3 text-[#19A1E6]" />
              Mês Atual
            </button>
            <button
              onClick={() => handleSend("Projete o dimensionamento para o próximo mês com +15% de demanda.")}
              className="px-2.5 py-1 bg-card border rounded-md whitespace-nowrap hover:border-primary/50 text-[11px] font-medium flex items-center gap-1"
            >
              <TrendingUp className="w-3 h-3 text-[#19A1E6]" />
              Próximo Mês
            </button>
            <button
              onClick={() => handleSend("Quais são as faixas horárias com maior risco de déficit e estouro de SLA?")}
              className="px-2.5 py-1 bg-card border rounded-md whitespace-nowrap hover:border-primary/50 text-[11px] font-medium flex items-center gap-1"
            >
              <AlertTriangle className="w-3 h-3 text-amber-500" />
              Gargalos
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-muted/10">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-xl p-3 text-xs leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-primary text-primary-foreground font-medium"
                      : "bg-card border text-foreground shadow-sm"
                  }`}
                >
                  <div className="whitespace-pre-wrap font-sans">{msg.text}</div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground p-2">
                <Sparkles className="w-3.5 h-3.5 animate-spin text-[#19A1E6]" />
                <span>O Oráculo está analisando os dados...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-2.5 bg-card border-t flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pergunte sobre os dados desta tela..."
              className="flex-1 bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs outline-none focus:border-primary text-foreground placeholder:text-muted-foreground"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-3 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-xs hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
