import { createFileRoute } from "@tanstack/react-router";
import { TimeGridSheet } from "@/components/TimeGridSheet";
import { SHEET_KEYS } from "@/lib/sheets";

import { useDimensionamento } from "@/context/DimensionamentoContext";

export const Route = createFileRoute("/whatsapp")({
  head: () => ({
    meta: [
      { title: "WhatsApp - Dimensionamento Care" },
      {
        name: "description",
        content: "Volume e capacity do WhatsApp por horário e dia da semana.",
      },
    ],
  }),
  component: WhatsAppComponent,
});

function WhatsAppComponent() {
  const { currentMonth } = useDimensionamento();

  return (
    <div>
      <div className="mb-4">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {currentMonth}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">WhatsApp</h1>
      </div>
      <TimeGridSheet
        sheetKey={SHEET_KEYS.whatsapp}
        title="Volume × Capacity - WhatsApp"
        subtitle="Capacity considera multi-atendimento (×4/3 sobre o capacity Webchat)."
      />
    </div>
  );
}
