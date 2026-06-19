import { createLazyFileRoute } from "@tanstack/react-router";
import { EscalaTeamManager } from "@/components/EscalaTeamManager";

export const Route = createLazyFileRoute("/previsao-escala")({
  component: PrevisaoEscalaPage,
});

function PrevisaoEscalaPage() {
  return (
    <div className="space-y-6">
      <div className="mb-2">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Yooga Care · WFM
        </div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Previsão da Escala</h1>
        <p className="text-sm text-muted-foreground">
          Visualização da escala futura contendo a equipe oficial CLT somada aos analistas
          simulados.
        </p>
      </div>
      <EscalaTeamManager showSimulated={true} readOnlyCLT={true} />
    </div>
  );
}
