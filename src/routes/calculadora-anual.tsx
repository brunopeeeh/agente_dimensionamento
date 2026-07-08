import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/calculadora-anual")({
  head: () => ({
    meta: [
      { title: "Calculadora Anual - Dimensionamento Care" },
      {
        name: "description",
        content:
          "Projeção anual de headcount: demanda, deflexão de IA, capacidade, turnover e timing de contratações.",
      },
    ],
  }),
});
