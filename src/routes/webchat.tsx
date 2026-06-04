import { createFileRoute } from "@tanstack/react-router";
import { TimeGridSheet } from "@/components/TimeGridSheet";
import { SHEET_KEYS } from "@/lib/sheets";

import { useDimensionamento } from "@/context/DimensionamentoContext";

export const Route = createFileRoute("/webchat")({
  head: () => ({
    meta: [
      { title: "Webchat - Dimensionamento Care" },
      { name: "description", content: "Volume e capacity do Webchat por horário e dia da semana." },
    ],
  }),
  component: WebchatComponent,
});

function WebchatComponent() {
  const { currentMonth } = useDimensionamento();

  return (
    <div>
      <div className="mb-4">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {currentMonth}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Webchat</h1>
      </div>
      <TimeGridSheet
        sheetKey={SHEET_KEYS.webchat}
        title="Volume × Capacity - Webchat"
        subtitle="Edite Volume ou Capacity Arredondado para ver resultado e déficit atualizarem."
      />
    </div>
  );
}
