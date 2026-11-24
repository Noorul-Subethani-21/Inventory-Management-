"use client";

import { EmptyState } from "@/components/shared/EmptyState";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, Inbox } from "lucide-react";
import { useState, type ReactNode } from "react";

export interface Column<T> {
  id: string;
  header: string;
  align?: "left" | "right";
  className?: string;
  sortValue?: (row: T) => string | number;
  cell: (row: T) => ReactNode;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  emptyTitle,
  emptyBody,
  toolbar,
  minWidth = 860,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyTitle: string;
  emptyBody: string;
  toolbar?: ReactNode;
  minWidth?: number;
}) {
  const [sort, setSort] = useState<{ id: string; dir: "asc" | "desc" } | null>(null);
  const column = columns.find((entry) => entry.id === sort?.id);
  const sorted = !sort || !column?.sortValue ? rows : [...rows].sort((a, b) => {
    const av = column.sortValue!(a);
    const bv = column.sortValue!(b);
    const base = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
    return sort.dir === "asc" ? base : -base;
  });

  return (
    <section className="overflow-hidden rounded-xl border border-line bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      {toolbar ? <div className="flex flex-col gap-3 border-b border-line px-4 py-3 lg:flex-row lg:items-center">{toolbar}</div> : null}
      {sorted.length === 0 ? (
        <EmptyState icon={<Inbox className="h-4 w-4" />} title={emptyTitle} body={emptyBody} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left" style={{ minWidth }}>
            <thead>
              <tr className="border-b border-line bg-[#fbfbfc]">
                {columns.map((entry) => {
                  const active = sort?.id === entry.id;
                  return (
                    <th
                      key={entry.id}
                      className={cn(
                        "px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-slate-500",
                        entry.align === "right" && "text-right",
                        entry.sortValue && "cursor-pointer select-none",
                        entry.className,
                      )}
                      onClick={() => {
                        if (!entry.sortValue) return;
                        setSort((current) => {
                          if (current?.id !== entry.id) return { id: entry.id, dir: "asc" };
                          if (current.dir === "asc") return { id: entry.id, dir: "desc" };
                          return null;
                        });
                      }}
                    >
                      <span className={cn("inline-flex items-center gap-1", entry.align === "right" && "flex-row-reverse")}>
                        {entry.header}
                        {active ? sort?.dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" /> : null}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <tr
                  key={rowKey(row)}
                  className={cn("border-b border-[#f1f2f4] last:border-0", onRowClick && "cursor-pointer hover:bg-[#f8f9fb]")}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((entry) => (
                    <td
                      key={entry.id}
                      className={cn("px-4 py-3 text-[13px] text-slate-700", entry.align === "right" && "text-right tabular-nums", entry.className)}
                    >
                      {entry.cell(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <footer className="border-t border-line px-4 py-2.5 text-[12px] text-slate-500">
        {sorted.length} {sorted.length === 1 ? "record" : "records"}
      </footer>
    </section>
  );
}
