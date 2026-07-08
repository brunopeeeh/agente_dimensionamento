import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { SaveStatus } from "@/context/types";
import type { PlannerInputs } from "./engine";
import type { CalculadoraAnualSnapshot, PersistedPlan } from "./useCalculadoraAnualState";

const PLAN_NAME = "principal";
const LOCAL_STORAGE_KEY = "calculadora-anual-state-v1";

type PlanRow = {
  inputs: Partial<PlannerInputs>;
  sources: PersistedPlan["sources"];
  scenario_key: string | null;
};

/**
 * Persistência autocontida do plano anual: tabela `calculadora_anual` (uma linha
 * por plano, chaveada por nome — não por mês) com fallback em localStorage
 * quando o Supabase não está configurado.
 */
export function useCalculadoraAnualPersistence(opts: {
  snapshot: CalculadoraAnualSnapshot;
  enabled: boolean;
  hydrate: (saved: PersistedPlan | null) => void;
}): { saveStatus: SaveStatus } {
  const { snapshot, enabled, hydrate } = opts;
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const hydrateRef = useRef(hydrate);
  hydrateRef.current = hydrate;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from("calculadora_anual")
            .select("inputs, sources, scenario_key")
            .eq("nome", PLAN_NAME)
            .maybeSingle();
          if (error) throw error;
          if (cancelled) return;
          const row = data as PlanRow | null;
          hydrateRef.current(
            row
              ? {
                  inputs: row.inputs,
                  sources: row.sources,
                  scenarioKey: (row.scenario_key ?? "base") as PersistedPlan["scenarioKey"],
                }
              : null,
          );
          return;
        } catch (err) {
          console.error("Failed to load calculadora_anual plan:", err);
          if (!cancelled) hydrateRef.current(null);
          return;
        }
      }

      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (!cancelled) hydrateRef.current(raw ? (JSON.parse(raw) as PersistedPlan) : null);
      } catch (err) {
        console.error("Failed to load calculadora anual from localStorage:", err);
        if (!cancelled) hydrateRef.current(null);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const delayDebounce = setTimeout(async () => {
      if (supabase) {
        try {
          setSaveStatus("saving");
          const { error } = await supabase.from("calculadora_anual").upsert(
            {
              nome: PLAN_NAME,
              scenario_key: snapshot.scenarioKey,
              inputs: snapshot.inputs,
              sources: snapshot.sources,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "nome" },
          );
          if (error) throw error;
          setSaveStatus("saved");
        } catch (err) {
          console.error("Auto-save of calculadora_anual failed:", err);
          setSaveStatus("error");
        }
        return;
      }

      try {
        localStorage.setItem(
          LOCAL_STORAGE_KEY,
          JSON.stringify({
            inputs: snapshot.inputs,
            sources: snapshot.sources,
            scenarioKey: snapshot.scenarioKey,
          } satisfies PersistedPlan),
        );
        setSaveStatus("saved");
      } catch (err) {
        console.error("Auto-save of calculadora anual to localStorage failed:", err);
        setSaveStatus("error");
      }
    }, 1000);

    return () => clearTimeout(delayDebounce);
  }, [enabled, snapshot]);

  return { saveStatus };
}
