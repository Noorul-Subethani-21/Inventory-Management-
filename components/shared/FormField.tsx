import type { ReactNode } from "react";

export const controlClass =
  "h-9 w-full rounded-lg border border-line bg-white px-3 text-[13px] text-ink outline-none transition placeholder:text-slate-400 focus:border-accent focus:ring-2 focus:ring-accent/15 disabled:cursor-not-allowed disabled:bg-slate-50";

export const textareaClass =
  "min-h-20 w-full rounded-lg border border-line bg-white px-3 py-2 text-[13px] text-ink outline-none transition placeholder:text-slate-400 focus:border-accent focus:ring-2 focus:ring-accent/15";

export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium text-slate-700">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-[12px] text-rose-600">{error}</span> : hint ? <span className="mt-1 block text-[12px] text-slate-500">{hint}</span> : null}
    </label>
  );
}
