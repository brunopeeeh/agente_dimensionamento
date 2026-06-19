import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/whatsapp")({
  head: () => ({
    meta: [
      { title: "WhatsApp - Dimensionamento Care" },
      {
        name: "description",
        content: "Volume e capacity do WhatsApp por horário e dia da semana.",
      },
    ],
  }),
});
