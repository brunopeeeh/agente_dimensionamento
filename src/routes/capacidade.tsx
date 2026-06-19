import { createFileRoute } from "@tanstack/react-router";

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
});
