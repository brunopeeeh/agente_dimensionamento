import { createLazyFileRoute } from "@tanstack/react-router";
import { TimeGridSheet } from "@/components/TimeGridSheet";
import { useDimensionamento } from "@/context/DimensionamentoContext";

export const Route = createLazyFileRoute("/webchat")({
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
        mode="webchat"
        title="Volume × Capacity - Webchat"
        subtitle="Edite Volume ou Capacity Arredondado para ver resultado e déficit atualizarem."
      />
    </div>
  );
}
