import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, MessageSquare, MessageCircle, ClipboardCheck, Users } from "lucide-react";
import { useDimensionamento } from "@/context/DimensionamentoContext";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Visão Geral - Dimensionamento Care" },
      {
        name: "description",
        content: "Painel interativo do dimensionamento de capacity Care.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { capacityAgents, currentMonth } = useDimensionamento();

  // Filter and calculate based on dynamic context state
  const humanAgents = capacityAgents.filter(
    (a) => a.name !== "Care AI" && a.name !== "Yooga Suporte",
  );
  const agents = humanAgents.length;
  const totalTri = humanAgents.reduce((s, r) => s + r.mediaTri, 0);

  const aiAgent = capacityAgents.find((a) => a.name === "Care AI");
  const aiVol = aiAgent ? aiAgent.mediaTri : 0;

  const yoogaAgent = capacityAgents.find((a) => a.name === "Yooga Suporte");
  const yoogaVol = yoogaAgent ? yoogaAgent.mediaTri : 0;

  const cards = [
    {
      to: "/capacidade",
      title: "Capacity por Agente",
      desc: "Volume trimestral, mensal, por dia, hora, 20min e 10min (editável em tempo real).",
      icon: Users,
    },
    {
      to: "/webchat",
      title: `Webchat - ${currentMonth}`,
      desc: "Volume × capacity por horário e dia da semana, com cálculo de agentes faltantes.",
      icon: MessageSquare,
    },
    {
      to: "/whatsapp",
      title: `WhatsApp - ${currentMonth}`,
      desc: "Mesma análise para o canal de WhatsApp, com janelas de SLA de 10 e 20 minutos.",
      icon: MessageCircle,
    },
    {
      to: "/contratacoes",
      title: "Prova Real - Contratações",
      desc: "Projeção pós-contratações, comparando dimensionamento atual e necessário.",
      icon: ClipboardCheck,
    },
  ] as const;

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-card p-6 shadow-sm sm:p-8">
        <div className="max-w-3xl">
          <div className="inline-flex rounded-full border bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground">
            {currentMonth}
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Dimensionamento Care
          </h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Versão interativa da planilha de capacity. Edite volumes e capacidades: os indicadores,
            déficits e excedentes recalculam na hora.
          </p>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Hero label="Agentes humanos" value={String(agents)} />
          <Hero
            label="Volume Mensal (Equipe)"
            value={Math.round(totalTri / 3).toLocaleString("pt-BR")}
          />
          <Hero
            label="Care AI / Mês"
            value={Math.round(aiVol / 3).toLocaleString("pt-BR")}
            accent
          />
          <Hero
            label="Yooga Suporte / Mês"
            value={Math.round(yoogaVol / 3).toLocaleString("pt-BR")}
          />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="group flex flex-col justify-between rounded-xl border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <c.icon className="h-5 w-5" />
                </div>
              </div>
              <h3 className="mt-4 text-lg font-semibold">{c.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{c.desc}</p>
            </div>
            <div className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-primary">
              Abrir{" "}
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}

function Hero({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border bg-card/80 p-4 shadow-sm backdrop-blur">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${accent ? "text-primary" : ""}`}>
        {value}
      </div>
    </div>
  );
}
