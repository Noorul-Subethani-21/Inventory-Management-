import type { Product, RangeKey, StockStatus } from "@/types";

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function uid(prefix: string) {
  const value = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(16).slice(2);
  return `${prefix}_${value.replace(/-/g, "").slice(0, 10)}`;
}

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatMoney(value: number, currency = "INR") {
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatCompact(value: number, currency = "INR") {
  const symbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : "₹";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (currency === "INR" && abs >= 10000000) return `${sign}${symbol}${(abs / 10000000).toFixed(1)}Cr`;
  if (currency === "INR" && abs >= 100000) return `${sign}${symbol}${(abs / 100000).toFixed(1)}L`;
  if (abs >= 1000) return `${sign}${symbol}${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1)}k`;
  return `${sign}${symbol}${Math.round(abs)}`;
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatQty(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

export function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function endOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

export function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function inRange(iso: string, start: Date, end: Date) {
  const time = new Date(iso).getTime();
  return time >= start.getTime() && time <= end.getTime();
}

export interface DateWindow {
  start: Date;
  end: Date;
  prevStart: Date;
  prevEnd: Date;
  key: RangeKey | "custom";
}

export function getPresetRange(key: RangeKey, now = new Date()): DateWindow {
  const end = endOfDay(now);
  if (key === "today") {
    const start = startOfDay(now);
    const prevEnd = new Date(start.getTime() - 1);
    return { start, end, prevStart: startOfDay(prevEnd), prevEnd, key };
  }
  if (key === "7d") {
    const start = startOfDay(addDays(now, -6));
    const prevEnd = new Date(start.getTime() - 1);
    return { start, end, prevStart: startOfDay(addDays(start, -7)), prevEnd, key };
  }
  if (key === "30d") {
    const start = startOfDay(addDays(now, -29));
    const prevEnd = new Date(start.getTime() - 1);
    return { start, end, prevStart: startOfDay(addDays(start, -30)), prevEnd, key };
  }
  const start = new Date(now.getFullYear(), 0, 1);
  const prevStart = new Date(now.getFullYear() - 1, 0, 1);
  const prevEnd = endOfDay(new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()));
  return { start, end, prevStart, prevEnd, key };
}

export function rangeFromDates(from: string, to: string): DateWindow {
  const start = startOfDay(parseDateInput(from));
  const end = endOfDay(parseDateInput(to));
  const span = Math.max(end.getTime() - start.getTime(), 0);
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - span);
  return { start, end, prevStart, prevEnd, key: "custom" };
}

export function percentChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function stockStatusOf(quantity: number, minStock: number): StockStatus {
  if (quantity <= 0) return "out_of_stock";
  if (quantity <= minStock) return "low_stock";
  return "in_stock";
}

export function stockValue(product: Pick<Product, "quantity" | "costPrice">) {
  return roundMoney(product.quantity * product.costPrice);
}

export function toDateInput(iso: string) {
  const date = new Date(iso);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function fromDateInput(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1, 12, 0, 0, 0).toISOString();
}

export function parseDateInput(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1, 12, 0, 0, 0);
}

export function todayInput() {
  return toDateInput(new Date().toISOString());
}

export function nextDocumentNumber(existing: string[], prefix: string) {
  let max = 24040;
  const pattern = new RegExp(`^${prefix}-(\\d+)$`);
  for (const value of existing) {
    const match = pattern.exec(value);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `${prefix}-${max + 1}`;
}

export function productSummary(items: { productName: string }[]) {
  if (items.length === 0) return "No products";
  if (items.length === 1) return items[0].productName;
  return `${items[0].productName} +${items.length - 1}`;
}

export function downloadCsv(filename: string, rows: Record<string, string | number>[]) {
  if (rows.length === 0) return false;
  const headers = Object.keys(rows[0]);
  const escape = (value: string | number) => {
    const text = String(value ?? "");
    if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
    return text;
  };
  const csv = [headers.join(","), ...rows.map((row) => headers.map((header) => escape(row[header] ?? "")).join(","))].join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  return true;
}

export function calculateSaleTotals(
  items: { quantity: number; unitPrice: number }[],
  discount: number,
  taxPercent: number,
) {
  const subtotal = roundMoney(items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0));
  const discountAmount = roundMoney(Math.min(Math.max(discount, 0), subtotal));
  const taxable = roundMoney(subtotal - discountAmount);
  const taxAmount = roundMoney((taxable * taxPercent) / 100);
  const grandTotal = roundMoney(taxable + taxAmount);
  return { subtotal, discountAmount, taxable, taxAmount, grandTotal };
}

export function calculatePurchaseTotals(items: { quantity: number; unitPrice: number }[], taxPercent: number) {
  const subtotal = roundMoney(items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0));
  const taxAmount = roundMoney((subtotal * taxPercent) / 100);
  const totalAmount = roundMoney(subtotal + taxAmount);
  return { subtotal, taxAmount, totalAmount };
}

export function matchesQuery(query: string, values: Array<string | number | undefined>) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return values.some((value) => String(value ?? "").toLowerCase().includes(needle));
}
