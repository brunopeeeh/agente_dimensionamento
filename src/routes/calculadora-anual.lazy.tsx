import { createLazyFileRoute } from "@tanstack/react-router";
import { CalculadoraAnual } from "@/features/calculadora-anual/components/CalculadoraAnual";

export const Route = createLazyFileRoute("/calculadora-anual")({
  component: CalculadoraAnual,
});
