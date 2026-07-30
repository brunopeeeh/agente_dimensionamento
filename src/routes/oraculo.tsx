import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/oraculo")({
  head: () => ({
    meta: [
      { title: "Oráculo IA - Dimensionamento Care" },
      {
        name: "description",
        content:
          "Assistente virtual inteligente especialista em WFM, Erlang C e planejamento de escalas para o Care Yooga.",
      },
    ],
  }),
});
