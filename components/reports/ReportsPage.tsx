"use client";

import { Button } from "@/components/shared/Button";
import { ChartCard, StatCard } from "@/components/shared/ChartCard";
import { DateRangeFilter } from "@/components/shared/DateRangeFilter";
import { DataTable } from "@/components/shared/DataTable";
import { FilterDropdown, SearchInput } from "@/components/shared/SearchInput";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useToast } from "@/components/shared/Toast";
import { ORDER_META, RECEIVING_META, STOCK_META } from "@/lib/constants";
import { purchaseReport, resolveWindow, salesReport, stockReport, windowSeries } from "@/lib/metrics";
import { printNode } from "@/lib/print";
import { useStore } from "@/lib/store";
import { downloadCsv, formatCompact, formatDate, formatMoney, stockStatusOf, toDateInput } from "@/lib/utils";
import type { RangeKey } from "@/types";
import { Clock, Download, PackageCheck, PackageX, Printer, Receipt, ShoppingCart, Star, TriangleAlert, Wallet } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Tab = "stock" | "sales" | "purchases";

export function ReportsPage() {
  const { state } = useStore();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("stock");
  const [preset, setPreset] = useState<RangeKey>("30d");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [query, setQuery] = useState("");
  const [stockStatus, setStockStatus] = useState("all");
  const printRef = useRef<HTMLDivElement>(null);

  const window = useMemo(() => resolveWindow(preset, from && to ? { from, to } : null), [preset, from, to]);

  if (!state) return null;
  const money = (value: number) => formatMoney(value, state.settings.currency);
  const stock = stockReport(state, query, stockStatus as "all" | "in_stock" | "low_stock" | "out_of_stock");
  const sales = salesReport(state, window, query);
  const purchases = purchaseReport(state, window, query);
  const series = windowSeries(state, window);

  const exportReport = () => {
    const stamp = toDateInput(new Date().toISOString());
    if (tab === "stock") {
      const ok = downloadCsv(`stock-report-${stamp}.csv`, stock.rows.map((product) => ({
        Product: product.name,
        SKU: product.sku,
        Category: product.category,
        Warehouse: product.warehouse,
        Quantity: product.quantity,
        Minimum: product.minStock,
        Status: STOCK_META[stockStatusOf(product.quantity, product.minStock)].label,
        "Unit cost": product.costPrice,
        "Stock value": product.quantity * product.costPrice,
      })));
      if (!ok) toast.error("Nothing to export for the current filters.");
      else toast.success("Stock report exported.");
    } else if (tab === "sales") {
      const ok = downloadCsv(`sales-report-${stamp}.csv`, sales.sales.map((sale) => ({
        Invoice: sale.invoiceNumber,
        Customer: sale.billTo.company,
        Date: formatDate(sale.date),
        Status: sale.orderStatus,
        Payment: sale.paymentStatus,
        Amount: sale.grandTotal,
      })));
      if (!ok) toast.error("Nothing to export for the current filters.");
      else toast.success("Sales report exported.");
    } else {
      const ok = downloadCsv(`purchase-report-${stamp}.csv`, purchases.purchases.map((purchase) => ({
        "Purchase order": purchase.poNumber,
        Supplier: purchase.supplier.company,
        Date: formatDate(purchase.orderDate),
        Receiving: purchase.receivingStatus,
        Payment: purchase.paymentStatus,
        Amount: purchase.totalAmount,
      })));
      if (!ok) toast.error("Nothing to export for the current filters.");
      else toast.success("Purchase report exported.");
    }
  };

  return (
    <div>
      <PageHeader
        description="Operational reports from the live ledger. Export or print the view you have filtered."
        actions={
          <>
            <Button variant="secondary" onClick={exportReport}><Download className="h-4 w-4" />Export CSV</Button>
            <Button variant="secondary" onClick={() => printRef.current && printNode(printRef.current, "InventoryOS report")}><Printer className="h-4 w-4" />Print</Button>
          </>
        }
      />
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="inline-flex rounded-lg border border-line bg-white p-0.5">
          {(["stock", "sales", "purchases"] as const).map((item) => (
            <button key={item} type="button" onClick={() => { setTab(item); setQuery(""); }} className={`h-8 rounded-md px-3 text-[13px] font-medium capitalize ${tab === item ? "bg-navy text-white" : "text-slate-600"}`}>
              {item}
            </button>
          ))}
        </div>
        {tab !== "stock" ? (
          <div className="flex flex-wrap items-center gap-2">
            <DateRangeFilter value={preset} onChange={(value) => { setPreset(value); setFrom(""); setTo(""); }} />
            <input aria-label="From" type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="h-9 rounded-lg border border-line bg-white px-3 text-[13px]" />
            <input aria-label="To" type="date" value={to} onChange={(event) => setTo(event.target.value)} className="h-9 rounded-lg border border-line bg-white px-3 text-[13px]" />
          </div>
        ) : null}
      </div>

      <div ref={printRef} className="space-y-4">
        {tab === "stock" ? (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard label="Inventory value" value={money(stock.value)} hint="at cost, filtered rows" icon={<Wallet className="h-4 w-4" />} />
              <StatCard label="Low stock" value={String(stock.low)} hint="across the catalogue" icon={<TriangleAlert className="h-4 w-4" />} />
              <StatCard label="Out of stock" value={String(stock.out)} hint="across the catalogue" icon={<PackageX className="h-4 w-4" />} />
            </div>
            <DataTable
              rows={stock.rows}
              rowKey={(row) => row.id}
              emptyTitle="No products match"
              emptyBody="Try another status or search."
              toolbar={
                <>
                  <SearchInput value={query} onChange={setQuery} placeholder="Search the stock report" />
                  <FilterDropdown label="Status" value={stockStatus} onChange={setStockStatus} options={[{ value: "all", label: "All stock" }, { value: "in_stock", label: "In stock" }, { value: "low_stock", label: "Low stock" }, { value: "out_of_stock", label: "Out of stock" }]} />
                </>
              }
              columns={[
                { id: "name", header: "Product", cell: (row) => row.name },
                { id: "sku", header: "SKU", cell: (row) => row.sku },
                { id: "category", header: "Category", cell: (row) => row.category },
                { id: "warehouse", header: "Warehouse", cell: (row) => row.warehouse },
                { id: "qty", header: "Quantity", align: "right", cell: (row) => row.quantity },
                { id: "value", header: "Value", align: "right", cell: (row) => money(row.quantity * row.costPrice) },
                { id: "status", header: "Status", cell: (row) => {
                  const stockState = stockStatusOf(row.quantity, row.minStock);
                  return <StatusBadge tone={STOCK_META[stockState].tone}>{STOCK_META[stockState].label}</StatusBadge>;
                } },
              ]}
            />
          </>
        ) : null}

        {tab === "sales" ? (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard label="Revenue" value={money(sales.revenue)} hint="confirmed orders" icon={<Receipt className="h-4 w-4" />} />
              <StatCard label="Orders" value={String(sales.orders)} hint="confirmed in range" icon={<ShoppingCart className="h-4 w-4" />} />
              <StatCard label="Best seller" value={sales.bestSellers[0]?.name ?? "—"} hint={sales.bestSellers[0] ? money(sales.bestSellers[0].revenue) : "No sales"} icon={<Star className="h-4 w-4" />} />
            </div>
            <ChartCard title="Sales trend" description="Confirmed revenue across the selected dates.">
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={series}>
                    <CartesianGrid stroke="#eef0f3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} minTickGap={24} />
                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={56} tickFormatter={(value) => formatCompact(Number(value), state.settings.currency)} />
                    <Tooltip formatter={(value) => money(Number(value))} contentStyle={{ border: "1px solid #e6e8ec", borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="sales" name="Sales" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
            <ChartCard title="Best-selling products" description="Line revenue after a proportional share of the order discount.">
              <ul className="divide-y divide-[#f1f2f4]">
                {sales.bestSellers.length === 0 ? <li className="py-6 text-center text-[13px] text-slate-500">No confirmed sales in this range.</li> : sales.bestSellers.map((item) => (
                  <li key={item.sku} className="flex items-center justify-between py-2 text-[13px]">
                    <span>{item.name}<span className="block text-[12px] text-slate-400">{item.sku} · {item.quantity} sold</span></span>
                    <span className="tabular-nums">{money(item.revenue)}</span>
                  </li>
                ))}
              </ul>
            </ChartCard>
            <DataTable
              rows={sales.sales}
              rowKey={(row) => row.id}
              emptyTitle="No sales in this range"
              emptyBody="Widen the dates or clear the search."
              toolbar={<SearchInput value={query} onChange={setQuery} placeholder="Search invoices" />}
              columns={[
                { id: "invoice", header: "Invoice", cell: (row) => row.invoiceNumber },
                { id: "customer", header: "Customer", cell: (row) => row.billTo.company },
                { id: "date", header: "Date", cell: (row) => formatDate(row.date) },
                { id: "status", header: "Status", cell: (row) => <StatusBadge tone={ORDER_META[row.orderStatus].tone}>{ORDER_META[row.orderStatus].label}</StatusBadge> },
                { id: "amount", header: "Amount", align: "right", cell: (row) => money(row.grandTotal) },
              ]}
            />
          </>
        ) : null}

        {tab === "purchases" ? (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard label="Purchase amount" value={money(purchases.total)} hint="excluding cancelled" icon={<ShoppingCart className="h-4 w-4" />} />
              <StatCard label="Pending" value={String(purchases.pending)} hint="not fully received" icon={<Clock className="h-4 w-4" />} />
              <StatCard label="Received" value={String(purchases.received)} hint="posted to stock" icon={<PackageCheck className="h-4 w-4" />} />
            </div>
            <ChartCard title="Supplier-wise purchases" description="Spend by supplier in the selected dates.">
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={purchases.suppliers} layout="vertical" margin={{ left: 24 }}>
                    <CartesianGrid stroke="#eef0f3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(value) => formatCompact(Number(value), state.settings.currency)} />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(value) => money(Number(value))} contentStyle={{ border: "1px solid #e6e8ec", borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="amount" name="Amount" fill="#172554" radius={[0, 4, 4, 0]} maxBarSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
            <DataTable
              rows={purchases.purchases}
              rowKey={(row) => row.id}
              emptyTitle="No purchases in this range"
              emptyBody="Widen the dates or clear the search."
              toolbar={<SearchInput value={query} onChange={setQuery} placeholder="Search purchase orders" />}
              columns={[
                { id: "po", header: "Purchase", cell: (row) => row.poNumber },
                { id: "supplier", header: "Supplier", cell: (row) => row.supplier.company },
                { id: "date", header: "Date", cell: (row) => formatDate(row.orderDate) },
                { id: "status", header: "Receiving", cell: (row) => <StatusBadge tone={RECEIVING_META[row.receivingStatus].tone}>{RECEIVING_META[row.receivingStatus].label}</StatusBadge> },
                { id: "amount", header: "Amount", align: "right", cell: (row) => money(row.totalAmount) },
              ]}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
