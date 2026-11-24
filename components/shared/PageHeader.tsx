import type { ReactNode } from "react";

export function PageHeader({ description, actions }: { description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <p className="max-w-2xl text-[13px] leading-5 text-slate-500">{description}</p>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
