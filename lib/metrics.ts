import { CATEGORY_COLORS } from "@/lib/constants";
import type { AppState, Product, RangeKey, Sale, StockMovement } from "@/types";
import {
  addDays,
  endOfDay,
  getPresetRange,
  inRange,
  percentChange,
  rangeFromDates,
  roundMoney,
  startOfDay,
  stockStatusOf,
  type DateWindow,
} from "@/lib/utils";

export interface SeriesPoint {
  label: string;
  current: number;
  previous: number;
}

export interface DashboardModel {
  window: DateWindow;
  productCount: number;
  productDelta: number;
  stockValue: number;
  stockDelta: number;
  salesTotal: number;
  salesDelta: number;
  salesOrders: number;
  purchaseTotal: number;
  purchaseDelta: number;
  purchaseOrders: number;
  lowStockCount: number;
  lowStockDelta: number;
  salesSeries: SeriesPoint[];
  purchaseSeries: { label: string; amount: number }[];
  distribution: { name: string; value: number; color: string }[];
  alerts: Product[];
  activities: AppState["activities"];
  recentSales: Sale[];
}

function quantityAt(product: Product, movements: StockMovement[], at: Date) {
  let quantity = product.quantity;
  for (const movement of movements) {
    if (movement.productId !== product.id) continue;
    if (new Date(movement.date).getTime() > at.getTime()) quantity -= movement.quantityChanged;
  }
  return quantity;
}

function valuation(state: AppState, at: Date) {
  return roundMoney(
    state.products.reduce((sum, product) => sum + Math.max(0, quantityAt(product, state.stockMovements, at)) * product.costPrice, 0),
  );
}

function lowCount(state: AppState, at: Date) {
  return state.products.filter((product) => quantityAt(product, state.stockMovements, at) <= product.minStock).length;
}

function confirmedSales(state: AppState, start: Date, end: Date) {
  return state.sales.filter((sale) => sale.orderStatus === "confirmed" && inRange(sale.date, start, end));
}

function activePurchases(state: AppState, start: Date, end: Date) {
  return state.purchases.filter((purchase) => purchase.receivingStatus !== "cancelled" && inRange(purchase.orderDate, start, end));
}

function buckets(window: DateWindow) {
  if (window.key === "today") {
    return Array.from({ length: 11 }, (_, index) => {
      const hour = 8 + index;
      const start = new Date(window.start);
      start.setHours(hour, 0, 0, 0);
      const end = new Date(start);
      end.setMinutes(59, 59, 999);
      return { label: `${hour}:00`, start, end };
    });
  }
  if (window.key === "year") {
    const months = window.end.getMonth() + 1;
    return Array.from({ length: months }, (_, month) => {
      const start = new Date(window.start.getFullYear(), month, 1);
      const end = endOfDay(new Date(window.start.getFullYear(), month + 1, 0));
      return { label: start.toLocaleDateString("en-IN", { month: "short" }), start, end };
    });
  }
  const days = Math.max(1, Math.round((startOfDay(window.end).getTime() - startOfDay(window.start).getTime()) / 86400000) + 1);
  const span = window.key === "7d" ? 7 : window.key === "30d" ? 30 : Math.min(days, 45);
  return Array.from({ length: span }, (_, index) => {
    const start = startOfDay(addDays(window.start, index));
    return {
      label: start.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      start,
      end: endOfDay(start),
    };
  });
}

function previousBuckets(window: DateWindow, count: number) {
  const span = window.end.getTime() - window.start.getTime();
  const prev: DateWindow = {
    start: window.prevStart,
    end: window.prevEnd,
    prevStart: new Date(window.prevStart.getTime() - span),
    prevEnd: new Date(window.prevStart.getTime() - 1),
    key: window.key,
  };
  const built = buckets(prev);
  if (built.length === count) return built;
  return Array.from({ length: count }, (_, index) => built[index] ?? { label: "", start: prev.start, end: prev.start });
}

export function resolveWindow(preset: RangeKey, custom: { from: string; to: string } | null) {
  if (custom?.from && custom?.to && custom.from <= custom.to) return rangeFromDates(custom.from, custom.to);
  return getPresetRange(preset);
}

export function buildDashboard(state: AppState, preset: RangeKey): DashboardModel {
  const window = getPresetRange(preset);
  const salesNow = confirmedSales(state, window.start, window.end);
  const salesPrev = confirmedSales(state, window.prevStart, window.prevEnd);
  const purchasesNow = activePurchases(state, window.start, window.end);
  const purchasesPrev = activePurchases(state, window.prevStart, window.prevEnd);
  const salesTotal = roundMoney(salesNow.reduce((sum, sale) => sum + sale.grandTotal, 0));
  const salesPrevTotal = roundMoney(salesPrev.reduce((sum, sale) => sum + sale.grandTotal, 0));
  const purchaseTotal = roundMoney(purchasesNow.reduce((sum, purchase) => sum + purchase.totalAmount, 0));
  const purchasePrevTotal = roundMoney(purchasesPrev.reduce((sum, purchase) => sum + purchase.totalAmount, 0));
  const stockNow = valuation(state, window.end);
  const stockThen = valuation(state, window.start);
  const productsThen = state.products.filter((product) => new Date(product.createdAt) <= window.start).length;
  const currentBuckets = buckets(window);
  const priorBuckets = previousBuckets(window, currentBuckets.length);

  const distributionMap = new Map<string, number>();
  for (const product of state.products) {
    distributionMap.set(product.category, (distributionMap.get(product.category) ?? 0) + product.quantity * product.costPrice);
  }

  return {
    window,
    productCount: state.products.length,
    productDelta: percentChange(state.products.length, productsThen),
    stockValue: stockNow,
    stockDelta: percentChange(stockNow, stockThen),
    salesTotal,
    salesDelta: percentChange(salesTotal, salesPrevTotal),
    salesOrders: salesNow.length,
    purchaseTotal,
    purchaseDelta: percentChange(purchaseTotal, purchasePrevTotal),
    purchaseOrders: purchasesNow.length,
    lowStockCount: state.products.filter((product) => stockStatusOf(product.quantity, product.minStock) !== "in_stock").length,
    lowStockDelta: percentChange(
      lowCount(state, window.end),
      lowCount(state, window.start),
    ),
    salesSeries: currentBuckets.map((bucket, index) => ({
      label: bucket.label,
      current: roundMoney(confirmedSales(state, bucket.start, bucket.end).reduce((sum, sale) => sum + sale.grandTotal, 0)),
      previous: roundMoney(
        confirmedSales(state, priorBuckets[index].start, priorBuckets[index].end).reduce((sum, sale) => sum + sale.grandTotal, 0),
      ),
    })),
    purchaseSeries: currentBuckets.map((bucket) => ({
      label: bucket.label,
      amount: roundMoney(activePurchases(state, bucket.start, bucket.end).reduce((sum, purchase) => sum + purchase.totalAmount, 0)),
    })),
    distribution: [...distributionMap.entries()]
      .map(([name, value]) => ({ name, value: roundMoney(value), color: CATEGORY_COLORS[name] ?? "#64748B" }))
      .filter((entry) => entry.value > 0)
      .sort((a, b) => b.value - a.value),
    alerts: state.products
      .filter((product) => stockStatusOf(product.quantity, product.minStock) !== "in_stock")
      .sort((a, b) => a.quantity - b.quantity || a.name.localeCompare(b.name)),
    activities: state.activities.filter((entry) => inRange(entry.date, window.start, window.end)).slice(0, 8),
    recentSales: state.sales
      .filter((sale) => inRange(sale.date, window.start, window.end))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 6),
  };
}

export function windowSeries(state: AppState, window: DateWindow) {
  const points = buckets(window);
  return points.map((bucket) => ({
    label: bucket.label,
    sales: roundMoney(confirmedSales(state, bucket.start, bucket.end).reduce((sum, sale) => sum + sale.grandTotal, 0)),
    purchases: roundMoney(activePurchases(state, bucket.start, bucket.end).reduce((sum, purchase) => sum + purchase.totalAmount, 0)),
  }));
}

export function customerSummary(state: AppState, customerId: string) {
  const orders = state.sales.filter((sale) => sale.customerId === customerId && sale.orderStatus !== "cancelled");
  return {
    orders: orders.length,
    value: roundMoney(orders.reduce((sum, sale) => sum + sale.grandTotal, 0)),
    history: orders.sort((a, b) => b.date.localeCompare(a.date)),
  };
}

export function supplierSummary(state: AppState, supplierId: string) {
  const orders = state.purchases.filter((purchase) => purchase.supplierId === supplierId && purchase.receivingStatus !== "cancelled");
  return {
    orders: orders.length,
    value: roundMoney(orders.reduce((sum, purchase) => sum + purchase.totalAmount, 0)),
    history: orders.sort((a, b) => b.orderDate.localeCompare(a.orderDate)),
  };
}

export function salesReport(state: AppState, window: DateWindow, query: string) {
  const needle = query.trim().toLowerCase();
  const sales = state.sales
    .filter((sale) => sale.orderStatus !== "cancelled" && inRange(sale.date, window.start, window.end))
    .filter((sale) => !needle || `${sale.invoiceNumber} ${sale.billTo.company} ${sale.billTo.name}`.toLowerCase().includes(needle))
    .sort((a, b) => b.date.localeCompare(a.date));
  const confirmed = sales.filter((sale) => sale.orderStatus === "confirmed");
  const products = new Map<string, { name: string; sku: string; quantity: number; revenue: number }>();
  for (const sale of confirmed) {
    const factor = sale.subtotal === 0 ? 1 : (sale.subtotal - sale.discount) / sale.subtotal;
    for (const item of sale.items) {
      const current = products.get(item.productId) ?? { name: item.productName, sku: item.sku, quantity: 0, revenue: 0 };
      current.quantity += item.quantity;
      current.revenue = roundMoney(current.revenue + item.quantity * item.unitPrice * factor);
      products.set(item.productId, current);
    }
  }
  return {
    sales,
    revenue: roundMoney(confirmed.reduce((sum, sale) => sum + sale.grandTotal, 0)),
    orders: confirmed.length,
    bestSellers: [...products.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 6),
  };
}

export function purchaseReport(state: AppState, window: DateWindow, query: string) {
  const needle = query.trim().toLowerCase();
  const purchases = state.purchases
    .filter((purchase) => inRange(purchase.orderDate, window.start, window.end))
    .filter((purchase) => !needle || `${purchase.poNumber} ${purchase.supplier.company} ${purchase.supplier.name}`.toLowerCase().includes(needle))
    .sort((a, b) => b.orderDate.localeCompare(a.orderDate));
  const active = purchases.filter((purchase) => purchase.receivingStatus !== "cancelled");
  const bySupplier = new Map<string, { name: string; orders: number; amount: number }>();
  for (const purchase of active) {
    const current = bySupplier.get(purchase.supplierId) ?? { name: purchase.supplier.company, orders: 0, amount: 0 };
    current.orders += 1;
    current.amount = roundMoney(current.amount + purchase.totalAmount);
    bySupplier.set(purchase.supplierId, current);
  }
  return {
    purchases,
    total: roundMoney(active.reduce((sum, purchase) => sum + purchase.totalAmount, 0)),
    pending: purchases.filter((purchase) => purchase.receivingStatus === "pending" || purchase.receivingStatus === "partial").length,
    received: purchases.filter((purchase) => purchase.receivingStatus === "received").length,
    suppliers: [...bySupplier.values()].sort((a, b) => b.amount - a.amount),
  };
}

export function stockReport(state: AppState, query: string, status: "all" | "low_stock" | "out_of_stock" | "in_stock") {
  const needle = query.trim().toLowerCase();
  const rows = state.products
    .filter((product) => status === "all" || stockStatusOf(product.quantity, product.minStock) === status)
    .filter((product) => !needle || `${product.name} ${product.sku} ${product.category} ${product.warehouse}`.toLowerCase().includes(needle))
    .sort((a, b) => a.name.localeCompare(b.name));
  return {
    rows,
    value: roundMoney(rows.reduce((sum, product) => sum + product.quantity * product.costPrice, 0)),
    low: state.products.filter((product) => stockStatusOf(product.quantity, product.minStock) === "low_stock").length,
    out: state.products.filter((product) => stockStatusOf(product.quantity, product.minStock) === "out_of_stock").length,
  };
}
