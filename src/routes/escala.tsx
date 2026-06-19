import { createFileRoute } from "@tanstack/react-router";

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
});
