import { createLazyFileRoute } from "@tanstack/react-router";
import { TimeGridSheet } from "@/components/TimeGridSheet";
import { useDimensionamento } from "@/context/DimensionamentoContext";

export const Route = createLazyFileRoute("/whatsapp")({
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
        mode="whatsapp"
        title="Volume × Capacity - WhatsApp"
        subtitle="Capacity considera multi-atendimento (×4/3 sobre o capacity Webchat)."
      />
    </div>
  );
}
