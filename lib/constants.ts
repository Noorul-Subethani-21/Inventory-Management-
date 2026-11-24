import type { MovementType, OrderStatus, PaymentStatus, ReceivingStatus, StockStatus } from "@/types";

export type BadgeTone = "success" | "warning" | "danger" | "info" | "neutral";

export const CATEGORIES = ["Peripherals", "Displays", "Audio", "Storage", "Accessories", "Computing"] as const;

export const CURRENCIES = [
  { code: "INR", label: "INR (₹)" },
  { code: "USD", label: "USD ($)" },
  { code: "EUR", label: "EUR (€)" },
] as const;

export const CURRENT_USER = {
  name: "Aditi Rao",
  role: "Operations lead",
  email: "aditi.rao@meridiancommerce.in",
  initials: "AR",
};

export const CATEGORY_COLORS: Record<string, string> = {
  Peripherals: "#172554",
  Displays: "#6366F1",
  Audio: "#0F766E",
  Storage: "#B45309",
  Accessories: "#64748B",
  Computing: "#4338CA",
};

type Meta = { label: string; tone: BadgeTone };

export const PAYMENT_META: Record<PaymentStatus, Meta> = {
  paid: { label: "Paid", tone: "success" },
  partial: { label: "Partial", tone: "warning" },
  unpaid: { label: "Unpaid", tone: "neutral" },
};

export const ORDER_META: Record<OrderStatus, Meta> = {
  draft: { label: "Draft", tone: "neutral" },
  pending: { label: "Pending", tone: "warning" },
  confirmed: { label: "Confirmed", tone: "success" },
  cancelled: { label: "Cancelled", tone: "danger" },
};

export const RECEIVING_META: Record<ReceivingStatus, Meta> = {
  pending: { label: "Pending", tone: "warning" },
  partial: { label: "Partial", tone: "info" },
  received: { label: "Received", tone: "success" },
  cancelled: { label: "Cancelled", tone: "danger" },
};

export const STOCK_META: Record<StockStatus, Meta> = {
  in_stock: { label: "In stock", tone: "success" },
  low_stock: { label: "Low stock", tone: "warning" },
  out_of_stock: { label: "Out of stock", tone: "danger" },
};

export const MOVEMENT_META: Record<MovementType, Meta> = {
  purchase: { label: "Purchase", tone: "info" },
  sale: { label: "Sale", tone: "neutral" },
  adjustment: { label: "Adjustment", tone: "warning" },
};
