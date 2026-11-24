"use client";

import { AppHeader } from "@/components/layout/AppHeader";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { useUi } from "@/components/providers";
import { LoadingState } from "@/components/shared/EmptyState";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  const { ready } = useStore();
  const ui = useUi();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuPath, setMenuPath] = useState(pathname);
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setMobileOpen(false);
  }

  useEffect(() => {
    const stored = localStorage.getItem("inventoryos.sidebar");
    if (stored === "collapsed") {
      // The preference lives in this browser and is not available during server render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCollapsed(true);
    }
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        ui.setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ui]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <LoadingState />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas text-ink">
      {mobileOpen ? (
        <button type="button" className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" aria-label="Close menu" onClick={() => setMobileOpen(false)} />
      ) : null}
      <AppSidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onNavigate={() => setMobileOpen(false)}
        onToggle={() => {
          setCollapsed((value) => {
            const next = !value;
            localStorage.setItem("inventoryos.sidebar", next ? "collapsed" : "open");
            return next;
          });
        }}
      />
      <div className={cn("min-h-screen transition-[padding] duration-200", collapsed ? "lg:pl-[76px]" : "lg:pl-[248px]")}>
        <AppHeader onMenu={() => setMobileOpen(true)} />
        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
