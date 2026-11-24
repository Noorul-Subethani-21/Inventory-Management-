import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-500 ring-1 ring-line">{icon}</div>
      <h3 className="mt-3 text-[14px] font-semibold text-ink">{title}</h3>
      <p className="mt-1 max-w-sm text-[13px] leading-5 text-slate-500">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function LoadingState({ label = "Loading workspace" }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-slate-500">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-navy" />
      <p className="text-[13px]">{label}</p>
    </div>
  );
}
