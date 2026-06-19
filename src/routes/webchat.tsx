import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/webchat")({
  head: () => ({
    meta: [
      { title: "Webchat - Dimensionamento Care" },
      { name: "description", content: "Volume e capacity do Webchat por horário e dia da semana." },
    ],
  }),
});
