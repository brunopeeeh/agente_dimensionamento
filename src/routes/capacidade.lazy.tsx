import { createLazyFileRoute } from "@tanstack/react-router";
import { AgentCapacity } from "@/components/AgentCapacity";
import { useDimensionamento } from "@/context/DimensionamentoContext";

export const Route = createLazyFileRoute("/capacidade")({
  component: CapacidadePage,
});

function CapacidadePage() {
  const { currentMonth } = useDimensionamento();

  return (
    <div className="space-y-2">
      <div className="mb-4">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Capacity p dia · {currentMonth}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Capacity por Agente</h1>
      </div>
      <AgentCapacity />
    </div>
  );
}
