import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/simulador")({
  head: () => ({
    meta: [
      { title: "Simulador de Cenários - Dimensionamento Care" },
      {
        name: "description",
        content:
          "Simule ausências de analistas e picos de chamados e veja o impacto no déficit, na cobertura e nas contratações necessárias.",
      },
    ],
  }),
});
