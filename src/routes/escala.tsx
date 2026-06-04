import { createFileRoute } from "@tanstack/react-router";
import { EscalaTeamManager } from "@/components/EscalaTeamManager";

export const Route = createFileRoute("/escala")({
  head: () => ({
    meta: [
      { title: "Gestão de Escalas - Dimensionamento Care" },
      {
        name: "description",
        content: "Administração de turnos e folgas para a equipe de suporte.",
      },
    ],
  }),
  component: () => (
    <div className="space-y-6">
      <div className="mb-2">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Yooga Care · WFM
        </div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Gestão de Escalas</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie a escala da equipe de suporte em tempo real.
        </p>
      </div>

      {/* Dynamic Shift Horizon Matrix Grid */}
      <EscalaTeamManager />
    </div>
  ),
});
