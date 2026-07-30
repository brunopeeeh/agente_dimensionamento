import { createLazyFileRoute } from "@tanstack/react-router";
import { OraculoChat } from "@/components/oraculo/OraculoChat";

export const Route = createLazyFileRoute("/oraculo")({
  component: OraculoPageComponent,
});

function OraculoPageComponent() {
  return (
    <div className="min-h-screen bg-background py-4">
      <OraculoChat />
    </div>
  );
}
