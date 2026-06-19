import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/painel")({
  head: () => ({
    meta: [
      { title: "Painel de Resumo - Dimensionamento Care" },
      {
        name: "description",
        content: "KPIs e gráficos de capacity, déficit e excedente por canal.",
      },
    ],
  }),
});
