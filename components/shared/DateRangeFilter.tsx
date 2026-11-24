"use client";

import { cn } from "@/lib/utils";
import type { RangeKey } from "@/types";

const OPTIONS: { id: RangeKey; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "year", label: "This year" },
];

export function DateRangeFilter({ value, onChange }: { value: RangeKey; onChange: (value: RangeKey) => void }) {
  return (
    <div className="inline-flex max-w-full flex-wrap rounded-lg border border-line bg-white p-0.5">
      {OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={cn(
            "h-8 rounded-md px-2.5 text-[12px] font-medium transition-colors",
            value === option.id ? "bg-navy text-white" : "text-slate-600 hover:bg-slate-50",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
