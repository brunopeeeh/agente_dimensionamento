import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/previsao-escala")({
  head: () => ({
    meta: [
      { title: "Previsão da Escala - Dimensionamento Care" },
      {
        name: "description",
        content: "Previsão da escala integrando analistas CLT e contratações sugeridas.",
      },
    ],
  }),
});
