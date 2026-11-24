import { Trend } from "@/components/shared/Trend";
import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  trend,
  hint,
  icon,
}: {
  label: string;
  value: string;
  trend?: number;
  hint: string;
  icon: ReactNode;
}) {
  return (
    <article className="rounded-xl border border-line bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-slate-500">{label}</p>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-slate-50 text-slate-500">{icon}</span>
      </div>
      <p className="mt-3 truncate text-[22px] font-semibold tracking-tight text-navy tabular-nums" title={value}>{value}</p>
      <div className="mt-1.5 flex items-center gap-1.5">
        {trend !== undefined ? <Trend value={trend} /> : null}
        <span className="text-[12px] text-slate-400">{hint}</span>
      </div>
    </article>
  );
}

export function ChartCard({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-line bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${className ?? ""}`}>
      <header className="flex items-start justify-between gap-3 px-5 py-4">
        <div>
          <h2 className="text-[14px] font-semibold text-ink">{title}</h2>
          {description ? <p className="mt-0.5 text-[12px] text-slate-500">{description}</p> : null}
        </div>
        {action}
      </header>
      <div className="px-5 pb-5">{children}</div>
    </section>
  );
}
