"use client";

import { NAV_ITEMS } from "@/components/layout/navigation";
import { CURRENT_USER } from "@/lib/constants";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { PanelLeft } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

function LogoMark() {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy text-white">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M2.2 5.4 8 2.4l5.8 3v5.2L8 13.6l-5.8-3V5.4Z" stroke="currentColor" strokeWidth="1.3" />
        <path d="M2.2 5.4 8 8.2l5.8-2.8M8 8.2v5.4" stroke="currentColor" strokeWidth="1.3" />
      </svg>
    </span>
  );
}

export function AppSidebar({
  collapsed,
  mobileOpen,
  onToggle,
  onNavigate,
}: {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggle: () => void;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const { state } = useStore();
  const workspace = state?.settings.businessName ?? "Meridian Commerce";

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-line bg-white transition-all duration-200",
        collapsed ? "w-[76px]" : "w-[248px]",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
      )}
    >
      <div className={cn("flex items-center gap-2.5 px-3 py-4", collapsed && "justify-center px-2")}>
        <LogoMark />
        {!collapsed ? (
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold tracking-tight text-navy">InventoryOS</p>
            <p className="truncate text-[11px] text-slate-500">{workspace}</p>
          </div>
        ) : null}
        <button
          type="button"
          onClick={onToggle}
          className="hidden h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-700 lg:inline-flex"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <PanelLeft className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors",
                collapsed && "justify-center px-0",
                active ? "bg-[#eef2ff] text-[#1e1b4b]" : "text-slate-600 hover:bg-slate-50",
              )}
            >
              <Icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-accent" : "text-slate-400")} />
              {!collapsed ? <span>{item.label}</span> : null}
            </Link>
          );
        })}
      </nav>

      <div className={cn("border-t border-line p-3", collapsed && "px-2")}>
        <div className={cn("flex items-center gap-2.5 rounded-lg px-1 py-1", collapsed && "justify-center")}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eef2ff] text-[11px] font-semibold text-[#3730a3]">
            {CURRENT_USER.initials}
          </span>
          {!collapsed ? (
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-medium text-ink">{CURRENT_USER.name}</span>
              <span className="block truncate text-[11px] text-slate-500">{CURRENT_USER.role}</span>
            </span>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
