import { ReactNode } from "react";
import { HelpCircle } from "lucide-react";

type TooltipProps = {
  content: string;
  children?: ReactNode;
};

export function Tooltip({ content, children }: TooltipProps) {
  return (
    <span className="group relative inline-flex items-center ml-1">
      {children || (
        <HelpCircle className="h-3 w-3 text-muted-foreground/60 cursor-help hover:text-foreground transition-colors shrink-0" />
      )}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-56 -translate-x-1/2 rounded-lg border border-border bg-popover/95 backdrop-blur-md p-2 text-[10px] font-normal leading-normal text-popover-foreground shadow-lg opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
        {content}
        <span className="absolute top-full left-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1 rotate-45 border-b border-r border-border bg-popover" />
      </span>
    </span>
  );
}
