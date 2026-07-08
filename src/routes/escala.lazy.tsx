import { createLazyFileRoute } from "@tanstack/react-router";
import { EscalaTeamManager } from "@/components/EscalaTeamManager";

export const Route = createLazyFileRoute("/escala")({
  component: EscalaPage,
});

function EscalaPage() {
  return (
    <div className="space-y-6">
      <div className="mb-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Gestão de Escalas</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie a escala da equipe de suporte em tempo real.
        </p>
      </div>
      <EscalaTeamManager />
    </div>
  );
}
