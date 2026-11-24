"use client";

import { NAV_ITEMS } from "@/components/layout/navigation";
import { useUi } from "@/components/providers";
import { CURRENT_USER } from "@/lib/constants";
import { useStore } from "@/lib/store";
import { formatMoney, stockStatusOf } from "@/lib/utils";
import type { EntityKind } from "@/types";
import { Bell, Menu, Plus, Search, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

const CREATE_ITEMS: { entity: EntityKind; label: string }[] = [
  { entity: "sale", label: "Sales order" },
  { entity: "purchase", label: "Purchase order" },
  { entity: "product", label: "Product" },
  { entity: "customer", label: "Customer" },
  { entity: "supplier", label: "Supplier" },
];

export function AppHeader({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname();
  const { state } = useStore();
  const ui = useUi();
  const current = NAV_ITEMS.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  const title = current?.label ?? "InventoryOS";
  const [createOpen, setCreateOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [menuPath, setMenuPath] = useState(pathname);
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setCreateOpen(false);
    setNoticeOpen(false);
    setProfileOpen(false);
  }

  const notifications = useMemo(() => {
    if (!state) return [];
    const items: { id: string; title: string; body: string; entity: EntityKind; entityId?: string }[] = [];
    if (state.settings.notifications.lowStock) {
      state.products
        .filter((product) => stockStatusOf(product.quantity, product.minStock) !== "in_stock")
        .slice(0, 4)
        .forEach((product) => {
          items.push({
            id: product.id,
            title: product.quantity <= 0 ? "Out of stock" : "Low stock",
            body: `${product.name} · ${product.quantity} on hand`,
            entity: "product",
            entityId: product.id,
          });
        });
    }
    if (state.settings.notifications.orders) {
      state.sales.slice(0, 2).forEach((sale) => {
        items.push({
          id: sale.id,
          title: sale.invoiceNumber,
          body: `${sale.billTo.company} · ${formatMoney(sale.grandTotal, state.settings.currency)}`,
          entity: "sale",
          entityId: sale.id,
        });
      });
    }
    if (state.settings.notifications.purchases) {
      state.purchases
        .filter((purchase) => purchase.receivingStatus === "pending")
        .slice(0, 2)
        .forEach((purchase) => {
          items.push({
            id: purchase.id,
            title: "Purchase awaiting receipt",
            body: `${purchase.poNumber} · ${purchase.supplier.company}`,
            entity: "purchase",
            entityId: purchase.id,
          });
        });
    }
    return items.slice(0, 8);
  }, [state]);

  return (
    <header className="app-header sticky top-0 z-30 flex h-[60px] items-center gap-3 border-b border-line bg-white/95 px-4 backdrop-blur sm:px-6">
      <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden" onClick={onMenu} aria-label="Open navigation">
        <Menu className="h-4 w-4" />
      </button>
      <div className="min-w-0">
        <p className="text-[11px] text-slate-400">InventoryOS / {title}</p>
        <h1 className="truncate text-[15px] font-semibold tracking-tight text-ink">{title}</h1>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={() => ui.setSearchOpen(true)}
          className="hidden h-9 w-[280px] items-center gap-2 rounded-lg border border-line bg-canvas px-3 text-[13px] text-slate-400 md:flex"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left">Search the workspace</span>
          <kbd className="rounded border border-line bg-white px-1.5 text-[10px] text-slate-400">Ctrl K</kbd>
        </button>
        <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line text-slate-500 md:hidden" onClick={() => ui.setSearchOpen(true)} aria-label="Search">
          <Search className="h-4 w-4" />
        </button>
        <MenuButton open={noticeOpen} onToggle={() => setNoticeOpen((value) => !value)} onClose={() => setNoticeOpen(false)} label="Notifications" icon={<Bell className="h-4 w-4" />} badge={notifications.length > 0}>
          <div className="w-[320px]">
            <p className="border-b border-line px-3 py-2 text-[12px] font-medium text-slate-500">Notifications</p>
            {notifications.length === 0 ? (
              <p className="px-3 py-6 text-center text-[13px] text-slate-500">Nothing needs attention.</p>
            ) : (
              <ul>
                {notifications.map((item) => (
                  <li key={`${item.entity}-${item.id}`}>
                    <button
                      type="button"
                      className="block w-full px-3 py-2.5 text-left hover:bg-slate-50"
                      onClick={() => {
                        if (item.entityId) ui.open(item.entity, item.entityId);
                        setNoticeOpen(false);
                      }}
                    >
                      <span className="block text-[13px] font-medium text-ink">{item.title}</span>
                      <span className="block text-[12px] text-slate-500">{item.body}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </MenuButton>
        <MenuButton
          open={createOpen}
          onToggle={() => setCreateOpen((value) => !value)}
          onClose={() => setCreateOpen(false)}
          label="Create"
          triggerClassName="inline-flex h-9 items-center gap-1.5 rounded-lg bg-navy px-3 text-[13px] font-medium text-white hover:bg-[#1e3a8a]"
          icon={
            <>
              <Plus className="h-4 w-4" />
              Create
            </>
          }
        >
          <div className="w-48 py-1">
            {CREATE_ITEMS.map((item) => (
              <button
                key={item.entity}
                type="button"
                className="block w-full px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  ui.create(item.entity);
                  setCreateOpen(false);
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </MenuButton>
        <MenuButton
          open={profileOpen}
          onToggle={() => setProfileOpen((value) => !value)}
          onClose={() => setProfileOpen(false)}
          label="Account"
          icon={<span className="text-[11px] font-semibold text-[#3730a3]">{CURRENT_USER.initials}</span>}
          avatar
        >
          <div className="w-64 p-3">
            <p className="text-[13px] font-medium text-ink">{CURRENT_USER.name}</p>
            <p className="text-[12px] text-slate-500">{CURRENT_USER.email}</p>
            <p className="mt-2 text-[12px] text-slate-400">Local workspace. No sign-in required.</p>
            <Link href="/settings" className="mt-3 flex items-center gap-2 rounded-lg px-2 py-2 text-[13px] text-slate-700 hover:bg-slate-50" onClick={() => setProfileOpen(false)}>
              <Settings className="h-4 w-4" />
              Workspace settings
            </Link>
          </div>
        </MenuButton>
      </div>
      {ui.searchOpen && state ? <SearchDialog onClose={() => ui.setSearchOpen(false)} /> : null}
    </header>
  );
}

function MenuButton({
  open,
  onToggle,
  onClose,
  label,
  icon,
  badge,
  avatar,
  triggerClassName,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  label: string;
  icon: ReactNode;
  badge?: boolean;
  avatar?: boolean;
  triggerClassName?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label={label}
        onClick={onToggle}
        className={
          triggerClassName ??
          (avatar
            ? "flex h-9 w-9 items-center justify-center rounded-full bg-[#eef2ff]"
            : "relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line text-slate-500 hover:bg-slate-50")
        }
      >
        {icon}
        {badge ? <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-accent" /> : null}
      </button>
      {open ? <div className="absolute right-0 z-20 mt-2 overflow-hidden rounded-xl border border-line bg-white shadow-lg">{children}</div> : null}
    </div>
  );
}

function SearchDialog({ onClose }: { onClose: () => void }) {
  const { state } = useStore();
  const ui = useUi();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  if (!state) return null;
  const needle = query.trim().toLowerCase();
  const products = state.products.filter((item) => `${item.name} ${item.sku}`.toLowerCase().includes(needle)).slice(0, 4);
  const customers = state.customers.filter((item) => `${item.name} ${item.company}`.toLowerCase().includes(needle)).slice(0, 3);
  const suppliers = state.suppliers.filter((item) => `${item.name} ${item.company}`.toLowerCase().includes(needle)).slice(0, 3);
  const sales = state.sales.filter((item) => `${item.invoiceNumber} ${item.billTo.company}`.toLowerCase().includes(needle)).slice(0, 3);
  const purchases = state.purchases.filter((item) => `${item.poNumber} ${item.supplier.company}`.toLowerCase().includes(needle)).slice(0, 3);
  const empty = needle.length > 0 && products.length + customers.length + suppliers.length + sales.length + purchases.length === 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-slate-900/40 p-4 pt-[12vh]">
      <button type="button" className="absolute inset-0" aria-label="Close search" onClick={onClose} />
      <div className="relative w-full max-w-xl overflow-hidden rounded-xl border border-line bg-white shadow-xl">
        <div className="flex items-center gap-2 border-b border-line px-3">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Products, invoices, customers, suppliers"
            className="h-12 w-full bg-transparent text-[14px] outline-none"
          />
        </div>
        <div className="max-h-[360px] overflow-y-auto py-2">
          {!needle ? <p className="px-4 py-8 text-center text-[13px] text-slate-500">Search by name, SKU, invoice, or company.</p> : null}
          {empty ? <p className="px-4 py-8 text-center text-[13px] text-slate-500">No matches for “{query}”.</p> : null}
          <ResultGroup title="Products" rows={products.map((item) => ({ id: item.id, label: item.name, meta: item.sku, entity: "product" as const }))} onPick={(id) => { ui.open("product", id); onClose(); }} />
          <ResultGroup title="Sales" rows={sales.map((item) => ({ id: item.id, label: item.invoiceNumber, meta: item.billTo.company, entity: "sale" as const }))} onPick={(id) => { ui.open("sale", id); onClose(); }} />
          <ResultGroup title="Purchases" rows={purchases.map((item) => ({ id: item.id, label: item.poNumber, meta: item.supplier.company, entity: "purchase" as const }))} onPick={(id) => { ui.open("purchase", id); onClose(); }} />
          <ResultGroup title="Customers" rows={customers.map((item) => ({ id: item.id, label: item.name, meta: item.company, entity: "customer" as const }))} onPick={(id) => { ui.open("customer", id); onClose(); }} />
          <ResultGroup title="Suppliers" rows={suppliers.map((item) => ({ id: item.id, label: item.company, meta: item.name, entity: "supplier" as const }))} onPick={(id) => { ui.open("supplier", id); onClose(); }} />
        </div>
      </div>
    </div>
  );
}

function ResultGroup({
  title,
  rows,
  onPick,
}: {
  title: string;
  rows: { id: string; label: string; meta: string }[];
  onPick: (id: string) => void;
}) {
  if (rows.length === 0) return null;
  return (
    <div className="px-2 py-1">
      <p className="px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">{title}</p>
      {rows.map((row) => (
        <button key={row.id} type="button" onClick={() => onPick(row.id)} className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left hover:bg-slate-50">
          <span className="text-[13px] font-medium text-ink">{row.label}</span>
          <span className="text-[12px] text-slate-500">{row.meta}</span>
        </button>
      ))}
    </div>
  );
}
