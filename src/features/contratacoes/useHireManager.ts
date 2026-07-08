import { useState } from "react";
import { useDimensionamento, Day, NewAgentHire } from "@/context/DimensionamentoContext";
import { getDefaultLunchTime } from "@/lib/time";

export function useHireManager() {
  const { newHires, setNewHires, isReadOnly } = useDimensionamento();

  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [newHireName, setNewHireName] = useState("");
  const [newHireStart, setNewHireStart] = useState("09:00");
  const [newHireEnd, setNewHireEnd] = useState("18:00");
  const [newHireLunch, setNewHireLunch] = useState("13:00");
  const [newHireDays, setNewHireDays] = useState<Day[]>([
    "Segunda",
    "Terça",
    "Quarta",
    "Quinta",
    "Sexta",
  ]);
  const [editingHireId, setEditingHireId] = useState<string | null>(null);

  const handleStartChange = (val: string) => {
    setNewHireStart(val);
    setNewHireLunch(getDefaultLunchTime(val));
    const startHour = parseInt(val.split(":")[0], 10);
    if (!isNaN(startHour)) {
      const endHour = (startHour + 9) % 24;
      setNewHireEnd(`${endHour.toString().padStart(2, "0")}:00`);
    }
  };

  const handleAddHire = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHireName) return;

    if (editingHireId) {
      setNewHires((prev) =>
        prev.map((h) =>
          h.id === editingHireId
            ? {
                ...h,
                name: newHireName,
                start_time: newHireStart,
                end_time: newHireEnd,
                days: newHireDays,
                lunch_start_time: newHireLunch || undefined,
              }
            : h,
        ),
      );
      setEditingHireId(null);
    } else {
      const newAgent: NewAgentHire = {
        id: "h_" + Date.now(),
        name: newHireName,
        start_time: newHireStart,
        end_time: newHireEnd,
        days: newHireDays,
        lunch_start_time: newHireLunch || undefined,
        active: true,
      };
      setNewHires((prev) => [...prev, newAgent]);
    }
    setNewHireName("");
  };

  const handleEditHire = (hire: NewAgentHire) => {
    setEditingHireId(hire.id);
    setNewHireName(hire.name);
    setNewHireStart(hire.start_time);
    setNewHireEnd(hire.end_time);
    setNewHireDays(hire.days);
    setNewHireLunch(hire.lunch_start_time || "");
  };

  const handleRemoveHire = (id: string) => {
    setNewHires((prev) => prev.filter((h) => h.id !== id));
  };

  const toggleHire = (id: string) => {
    setNewHires((prev) => prev.map((h) => (h.id === id ? { ...h, active: !h.active } : h)));
  };

  const handleToggleDaySelection = (day: Day) => {
    setNewHireDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  };

  return {
    isManagerOpen,
    setIsManagerOpen,
    newHireName,
    setNewHireName,
    newHireStart,
    newHireEnd,
    setNewHireEnd,
    newHireLunch,
    setNewHireLunch,
    newHireDays,
    editingHireId,
    setEditingHireId,
    handleStartChange,
    handleAddHire,
    handleEditHire,
    handleRemoveHire,
    toggleHire,
    handleToggleDaySelection,
    newHires,
    isReadOnly,
  };
}
