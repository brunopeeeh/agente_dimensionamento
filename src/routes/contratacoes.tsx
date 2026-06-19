import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/contratacoes")({
  head: () => ({
    meta: [
      { title: "Simular Escala - Prova Real" },
      {
        name: "description",
        content: "Simule e valide escalas de contratação na escala de suporte.",
      },
    ],
  }),
});
