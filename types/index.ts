export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";
export type PaymentStatus = "paid" | "partial" | "unpaid";
export type OrderStatus = "draft" | "pending" | "confirmed" | "cancelled";
export type ReceivingStatus = "pending" | "partial" | "received" | "cancelled";
export type MovementType = "purchase" | "sale" | "adjustment";
export type RangeKey = "today" | "7d" | "30d" | "year";
export type CurrencyCode = "INR" | "USD" | "EUR";
export type EntityKind = "sale" | "purchase" | "product" | "customer" | "supplier";

export interface Party {
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  description: string;
  unitPrice: number;
  costPrice: number;
  quantity: number;
  minStock: number;
  warehouse: string;
  imageUrl?: string;
  createdAt: string;
}

export interface Customer extends Party {
  id: string;
  createdAt: string;
}

export interface Supplier extends Party {
  id: string;
  createdAt: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  customerId: string;
  billTo: Party;
  date: string;
  items: SaleItem[];
  discount: number;
  taxPercent: number;
  subtotal: number;
  taxAmount: number;
  grandTotal: number;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
}

export interface Purchase {
  id: string;
  poNumber: string;
  supplierId: string;
  supplier: Party;
  orderDate: string;
  expectedDelivery: string;
  items: PurchaseItem[];
  taxPercent: number;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  receivingStatus: ReceivingStatus;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: MovementType;
  quantityChanged: number;
  previousStock: number;
  currentStock: number;
  date: string;
  referenceId: string;
  note?: string;
}

export interface Activity {
  id: string;
  title: string;
  description: string;
  date: string;
  entity?: EntityKind;
  entityId?: string;
}

export interface NotificationPrefs {
  lowStock: boolean;
  orders: boolean;
  purchases: boolean;
}

export interface Settings {
  businessName: string;
  email: string;
  phone: string;
  address: string;
  gstin: string;
  currency: CurrencyCode;
  taxPercent: number;
  warehouses: string[];
  notifications: NotificationPrefs;
}

export interface AppState {
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  sales: Sale[];
  purchases: Purchase[];
  stockMovements: StockMovement[];
  activities: Activity[];
  settings: Settings;
}

export interface SaleInput {
  customerId: string;
  date: string;
  items: { productId: string; quantity: number; unitPrice: number }[];
  discount: number;
  taxPercent: number;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
}

export interface PurchaseInput {
  supplierId: string;
  orderDate: string;
  expectedDelivery: string;
  items: { productId: string; quantity: number; unitPrice: number }[];
  taxPercent: number;
  paymentStatus: PaymentStatus;
  receivingStatus: ReceivingStatus;
}

export interface ProductInput {
  name: string;
  sku: string;
  category: string;
  description: string;
  unitPrice: number;
  costPrice: number;
  quantity: number;
  minStock: number;
  warehouse: string;
  imageUrl?: string;
}

export type ProductUpdate = Omit<ProductInput, "quantity">;

export interface PartyInput {
  name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
}

export interface AdjustmentInput {
  productId: string;
  delta: number;
  note: string;
}

export interface OperationOptions {
  id?: string;
  number?: string;
  at?: string;
  silent?: boolean;
  note?: string;
  referenceId?: string;
}
