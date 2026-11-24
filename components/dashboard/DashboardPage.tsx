"use client";

import { useUi } from "@/components/providers";
import { ChartCard, StatCard } from "@/components/shared/ChartCard";
import { DateRangeFilter } from "@/components/shared/DateRangeFilter";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ORDER_META, PAYMENT_META, STOCK_META } from "@/lib/constants";
import { buildDashboard } from "@/lib/metrics";
import { useStore } from "@/lib/store";
import { formatCompact, formatDate, formatMoney, stockStatusOf } from "@/lib/utils";
import type { RangeKey } from "@/types";
import { Package, Receipt, ShoppingCart, TriangleAlert, Wallet } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function DashboardPage() {
  const { state } = useStore();
  const ui = useUi();
  const [range, setRange] = useState<RangeKey>("30d");
  if (!state) return null;
  const data = buildDashboard(state, range);
  const currency = state.settings.currency;
  const money = (value: number) => formatMoney(value, currency);

  return (
    <div>
      <PageHeader
        description="Operating picture for Meridian Commerce. Figures are calculated from the orders and stock ledger in this workspace."
        actions={<DateRangeFilter value={range} onChange={setRange} />}
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total products" value={String(data.productCount)} trend={data.productDelta} hint="vs period start" icon={<Package className="h-4 w-4" />} />
        <StatCard label="Stock value" value={money(data.stockValue)} trend={data.stockDelta} hint="vs period start" icon={<Wallet className="h-4 w-4" />} />
        <StatCard label="Total sales" value={money(data.salesTotal)} trend={data.salesDelta} hint="vs previous period" icon={<Receipt className="h-4 w-4" />} />
        <StatCard label="Total purchases" value={money(data.purchaseTotal)} trend={data.purchaseDelta} hint="vs previous period" icon={<ShoppingCart className="h-4 w-4" />} />
        <StatCard label="Low stock items" value={String(data.lowStockCount)} trend={data.lowStockDelta} hint="vs period start" icon={<TriangleAlert className="h-4 w-4" />} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <ChartCard className="xl:col-span-2" title="Sales overview" description="Confirmed revenue in the selected period.">
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.salesSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#eef0f3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} minTickGap={24} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={56} tickFormatter={(value) => formatCompact(Number(value), currency)} />
                <Tooltip formatter={(value) => money(Number(value))} contentStyle={{ border: "1px solid #e6e8ec", borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="current" name="This period" stroke="#6366f1" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="previous" name="Previous" stroke="#cbd5e1" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
        <ChartCard title="Stock distribution" description="Current inventory value by category.">
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.distribution} dataKey="value" nameKey="name" innerRadius={52} outerRadius={74} paddingAngle={2} stroke="#fff">
                  {data.distribution.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => money(Number(value))} contentStyle={{ border: "1px solid #e6e8ec", borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 space-y-1.5">
            {data.distribution.map((entry) => (
              <li key={entry.name} className="flex items-center justify-between text-[12px]">
                <span className="flex items-center gap-2 text-slate-600">
                  <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
                  {entry.name}
                </span>
                <span className="tabular-nums text-ink">{money(entry.value)}</span>
              </li>
            ))}
          </ul>
        </ChartCard>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <ChartCard className="xl:col-span-2" title="Purchase overview" description="Purchase orders excluding cancelled documents.">
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.purchaseSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#eef0f3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} minTickGap={24} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={56} tickFormatter={(value) => formatCompact(Number(value), currency)} />
                <Tooltip formatter={(value) => money(Number(value))} contentStyle={{ border: "1px solid #e6e8ec", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="amount" name="Purchases" fill="#172554" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
        <ChartCard title="Low stock alerts" description="Products at or below their minimum." action={<Link href="/inventory" className="text-[12px] font-medium text-accent">View inventory</Link>}>
          {data.alerts.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-slate-500">Every product is above its minimum.</p>
          ) : (
            <ul className="divide-y divide-[#f1f2f4]">
              {data.alerts.slice(0, 6).map((product) => {
                const status = stockStatusOf(product.quantity, product.minStock);
                return (
                  <li key={product.id} className="flex items-center justify-between gap-3 py-2.5">
                    <button type="button" className="min-w-0 text-left" onClick={() => ui.open("product", product.id)}>
                      <span className="block truncate text-[13px] font-medium text-ink">{product.name}</span>
                      <span className="block text-[12px] text-slate-500">{product.sku} · min {product.minStock}</span>
                    </button>
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] tabular-nums text-ink">{product.quantity}</span>
                      <StatusBadge tone={STOCK_META[status].tone}>{STOCK_META[status].label}</StatusBadge>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </ChartCard>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <ChartCard className="lg:col-span-2" title="Recent activity" description="Transactions in the selected period.">
          {data.activities.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-slate-500">No activity in this period.</p>
          ) : (
            <ol className="space-y-3">
              {data.activities.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => item.entity && item.entityId && ui.open(item.entity, item.entityId)}
                  >
                    <span className="block text-[13px] font-medium text-ink">{item.title}</span>
                    <span className="block text-[12px] text-slate-500">{item.description}</span>
                    <span className="mt-0.5 block text-[11px] text-slate-400">{formatDate(item.date)}</span>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </ChartCard>
        <ChartCard className="lg:col-span-3" title="Recent sales" description="Latest orders in the selected period.">
          {data.recentSales.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-slate-500">No sales in this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wide text-slate-400">
                    <th className="pb-2 font-medium">Invoice</th>
                    <th className="pb-2 font-medium">Customer</th>
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 text-right font-medium">Amount</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentSales.map((sale) => (
                    <tr key={sale.id} className="cursor-pointer border-t border-[#f1f2f4] hover:bg-canvas" onClick={() => ui.open("sale", sale.id)}>
                      <td className="py-2.5 text-[13px] font-medium text-ink">{sale.invoiceNumber}</td>
                      <td className="py-2.5 text-[13px] text-slate-600">{sale.billTo.company}</td>
                      <td className="py-2.5 text-[13px] text-slate-500">{formatDate(sale.date)}</td>
                      <td className="py-2.5 text-right text-[13px] tabular-nums text-ink">{money(sale.grandTotal)}</td>
                      <td className="py-2.5">
                        <div className="flex gap-1.5">
                          <StatusBadge tone={ORDER_META[sale.orderStatus].tone}>{ORDER_META[sale.orderStatus].label}</StatusBadge>
                          <StatusBadge tone={PAYMENT_META[sale.paymentStatus].tone}>{PAYMENT_META[sale.paymentStatus].label}</StatusBadge>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
