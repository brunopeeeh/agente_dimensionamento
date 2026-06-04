import { createFileRoute } from "@tanstack/react-router";
import { TimeGridSheet } from "@/components/TimeGridSheet";
import { SHEET_KEYS } from "@/lib/sheets";
import { useDimensionamento } from "@/context/DimensionamentoContext";

export const Route = createFileRoute("/contratacoes")({
  head: () => ({
    meta: [
      { title: "Prova Real - Contratações" },
      {
        name: "description",
        content: "Projeção pós-contratações: volume × capacity por horário e dia.",
      },
    ],
  }),
  component: ContratacoesComponent,
});

function ContratacoesComponent() {
  const { currentMonth } = useDimensionamento();

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {currentMonth} · Cenário
        </div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Prova Real - Contratações
        </h1>
        <p className="text-sm text-muted-foreground">
          Simule o impacto dos novos contratados inseridos na escala de trabalho.
        </p>
      </div>

      <TimeGridSheet
        sheetKey={SHEET_KEYS.prova}
        title="Volume × Capacity - Pós-contratações"
        subtitle="O capacity reflete a escala atual somada às contratações ativas do simulador."
      />
    </div>
  );
}
