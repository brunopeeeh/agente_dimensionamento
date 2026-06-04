import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useDimensionamento } from "@/context/DimensionamentoContext";
import {
  Activity,
  Users,
  MessageSquare,
  MessageCircle,
  ClipboardCheck,
  BarChart3,
  Calendar,
  Plus,
  Loader2,
} from "lucide-react";

const items = [
  { to: "/", label: "Visão Geral", icon: Activity },
  { to: "/painel", label: "Painel", icon: BarChart3 },
  { to: "/escala", label: "Gestão de Escalas", icon: Calendar },
  { to: "/capacidade", label: "Capacity por Agente", icon: Users },
  { to: "/webchat", label: "Webchat", icon: MessageSquare },
  { to: "/whatsapp", label: "WhatsApp", icon: MessageCircle },
  { to: "/contratacoes", label: "Prova Real", icon: ClipboardCheck },
] as const;

export function SiteNav() {
  const { currentMonth, availableMonths, isLoading, changeActiveMonth, createNewMonth } =
    useDimensionamento();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newMonthName, setNewMonthName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "ADD_NEW") {
      setIsModalOpen(true);
      // Reset select visual value back to currentMonth
      e.target.value = currentMonth;
    } else {
      changeActiveMonth(val);
    }
  };

  const handleCreateMonth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMonthName.trim()) return;

    setIsCreating(true);
    try {
      await createNewMonth(newMonthName.trim());
      setIsModalOpen(false);
      setNewMonthName("");
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-1 px-4 py-3 sm:gap-2">
          <div className="mr-3 flex items-center gap-2">
            <Link to="/" className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
                <Activity className="h-4 w-4" />
              </div>
              <div className="leading-tight">
                <div className="text-sm font-semibold">Dimensionamento Care</div>
              </div>
            </Link>
            <div className="flex items-center gap-1 border-l pl-2 h-7">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground mr-0.5" />
              <select
                value={currentMonth}
                onChange={handleMonthChange}
                disabled={isLoading}
                className="bg-transparent text-[11px] font-semibold text-muted-foreground focus:outline-none cursor-pointer hover:text-foreground transition-colors border-none p-0 pr-1 select-none"
              >
                {availableMonths.map((m) => (
                  <option key={m} value={m} className="bg-card text-foreground text-xs">
                    {m}
                  </option>
                ))}
                <option value="ADD_NEW" className="bg-card text-primary text-xs font-semibold">
                  + Adicionar Novo Mês
                </option>
              </select>
              {isLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground ml-1" />}
            </div>
          </div>
          <nav className="flex flex-1 flex-wrap items-center gap-1 justify-end sm:justify-start">
            {items.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                activeProps={{ className: "bg-primary text-primary-foreground" }}
                activeOptions={{ exact: true }}
                className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Modal Premium para criar novo mês */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Adicionar Novo Mês de Planejamento
            </h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Um novo período será criado. A escala de equipe e capacidades serão clonadas
              automaticamente do mês de <strong>{currentMonth}</strong>. Os volumes de chamados
              iniciarão zerados.
            </p>
            <form onSubmit={handleCreateMonth} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Nome do Mês / Período
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Março 2026, Abril 2026..."
                  value={newMonthName}
                  onChange={(e) => setNewMonthName(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  disabled={isCreating}
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setNewMonthName("");
                  }}
                  className="rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
                  disabled={isCreating}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                  disabled={isCreating || !newMonthName.trim()}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Criar Período
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
