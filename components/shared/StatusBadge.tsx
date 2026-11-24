import { cn } from "@/lib/utils";
import type { BadgeTone } from "@/lib/constants";

const tones: Record<BadgeTone, string> = {
  success: "bg-emerald-50 text-emerald-800 ring-emerald-600/15",
  warning: "bg-amber-50 text-amber-800 ring-amber-600/15",
  danger: "bg-rose-50 text-rose-700 ring-rose-600/15",
  info: "bg-indigo-50 text-indigo-700 ring-indigo-600/15",
  neutral: "bg-slate-100 text-slate-600 ring-slate-500/10",
};

export function StatusBadge({ tone, children }: { tone: BadgeTone; children: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset", tones[tone])}>
      {children}
    </span>
  );
}
