import type { ComponentType, ReactNode } from "react";
import { ChevronDown } from "lucide-react";

type Props = {
  title: string;
  icon?: ComponentType<{ className?: string }>;
  defaultOpen?: boolean;
  children: ReactNode;
};

export function CollapsibleSection({ title, icon: Icon, defaultOpen = false, children }: Props) {
  return (
    <details open={defaultOpen} className="group rounded-xl border border-border bg-card shadow-sm">
      <summary className="flex cursor-pointer select-none items-center gap-2 px-4 py-3 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        <span className="flex-1">{title}</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-3 border-t border-border/40 px-4 py-3">{children}</div>
    </details>
  );
}
