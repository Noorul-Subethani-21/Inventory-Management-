import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

export function Trend({ value }: { value: number }) {
  const flat = Math.abs(value) < 0.05;
  const up = value > 0;
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[12px] font-medium tabular-nums",
        flat ? "text-slate-500" : up ? "text-emerald-700" : "text-rose-700",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {value > 0 ? "+" : ""}
      {value.toFixed(1)}%
    </span>
  );
}
