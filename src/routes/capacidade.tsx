import { createFileRoute } from "@tanstack/react-router";
import { AgentCapacity } from "@/components/AgentCapacity";
import { useDimensionamento } from "@/context/DimensionamentoContext";

export const Route = createFileRoute("/capacidade")({
  head: () => ({
    meta: [
      { title: "Capacity por Agente - Dimensionamento Care" },
      {
        name: "description",
        content: "Capacity por agente: volume trimestral, mensal, diário, por hora, 20min e 10min.",
      },
    ],
  }),
  component: CapacidadeComponent,
});

function CapacidadeComponent() {
  const { currentMonth } = useDimensionamento();

  return (
    <div className="space-y-2">
      <PageTitle title="Capacity por Agente" subtitle={`Capacity p dia · ${currentMonth}`} />
      <AgentCapacity />
    </div>
  );
}

function PageTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-4">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {subtitle}
      </div>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
    </div>
  );
}
