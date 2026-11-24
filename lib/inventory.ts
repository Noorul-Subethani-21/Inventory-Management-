import type {
  Activity,
  AdjustmentInput,
  AppState,
  Customer,
  OperationOptions,
  Party,
  PartyInput,
  Product,
  ProductInput,
  ProductUpdate,
  Purchase,
  PurchaseInput,
  Sale,
  SaleInput,
  Settings,
  StockMovement,
  Supplier,
} from "@/types";
import {
  calculatePurchaseTotals,
  calculateSaleTotals,
  formatMoney,
  nextDocumentNumber,
  roundMoney,
  startOfDay,
  uid,
} from "@/lib/utils";

export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

function fail(error: string): Result<never> {
  return { ok: false, error };
}

function nowIso(at?: string) {
  return at ?? new Date().toISOString();
}

function snapshot(party: Party): Party {
  return {
    name: party.name.trim(),
    company: party.company.trim(),
    email: party.email.trim(),
    phone: party.phone.trim(),
    address: party.address.trim(),
  };
}

function sumLines(items: { productId: string; quantity: number }[]) {
  const map = new Map<string, number>();
  for (const item of items) map.set(item.productId, (map.get(item.productId) ?? 0) + item.quantity);
  return map;
}

function committedSaleQty(sale: Sale | null) {
  if (!sale || sale.orderStatus !== "confirmed") return new Map<string, number>();
  return sumLines(sale.items);
}

function committedPurchaseQty(purchase: Purchase | null) {
  if (!purchase || purchase.receivingStatus !== "received") return new Map<string, number>();
  return sumLines(purchase.items);
}

/**
 * Stock changes are the difference between the previously posted quantity and the
 * next posted quantity. Saving a received purchase or confirmed sale again, with
 * the same lines, produces a zero delta and does not move stock a second time.
 */
function stockDelta(before: Map<string, number>, after: Map<string, number>, direction: "in" | "out") {
  const ids = new Set([...before.keys(), ...after.keys()]);
  const deltas = new Map<string, number>();
  for (const id of ids) {
    const change = (after.get(id) ?? 0) - (before.get(id) ?? 0);
    const delta = direction === "in" ? change : -change;
    if (delta !== 0) deltas.set(id, delta);
  }
  return deltas;
}

function withActivity(state: AppState, activity: Activity | null): AppState {
  if (!activity) return state;
  return { ...state, activities: [activity, ...state.activities].slice(0, 300) };
}

function activity(input: Omit<Activity, "id" | "date"> & { date?: string }): Activity {
  return { id: uid("act"), date: input.date ?? new Date().toISOString(), ...input };
}

function applyDeltas(
  state: AppState,
  deltas: Map<string, number>,
  meta: { type: StockMovement["type"]; referenceId: string; date: string; note?: string },
): Result<AppState> {
  if (deltas.size === 0) return ok(state);
  const products = state.products.map((product) => ({ ...product }));
  const byId = new Map(products.map((product) => [product.id, product]));
  const shortages: string[] = [];

  for (const [productId, delta] of deltas) {
    const product = byId.get(productId);
    if (!product) return fail("A selected product is no longer in the catalogue.");
    if (product.quantity + delta < 0) {
      shortages.push(`${product.name} has ${product.quantity} available, this change needs ${Math.abs(delta)}`);
    }
  }
  if (shortages.length > 0) return fail(`Not enough stock. ${shortages.join(". ")}.`);

  const movements: StockMovement[] = [];
  for (const [productId, delta] of deltas) {
    const product = byId.get(productId)!;
    const previousStock = product.quantity;
    const currentStock = previousStock + delta;
    product.quantity = currentStock;
    movements.unshift({
      id: uid("mov"),
      productId,
      productName: product.name,
      type: meta.type,
      quantityChanged: delta,
      previousStock,
      currentStock,
      date: meta.date,
      referenceId: meta.referenceId,
      note: meta.note,
    });
  }

  return ok({ ...state, products, stockMovements: [...movements, ...state.stockMovements] });
}

function cleanLines(state: AppState, items: { productId: string; quantity: number; unitPrice: number }[], priceLabel: string) {
  if (items.length === 0) return fail("Add at least one product.");
  const lines: { product: Product; quantity: number; unitPrice: number }[] = [];
  for (const item of items) {
    const product = state.products.find((entry) => entry.id === item.productId);
    if (!product) return fail("One of the selected products no longer exists.");
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) return fail(`Enter a whole quantity for ${product.name}.`);
    if (!(item.unitPrice > 0)) return fail(`Enter a ${priceLabel} for ${product.name}.`);
    lines.push({ product, quantity: item.quantity, unitPrice: roundMoney(item.unitPrice) });
  }
  return ok(lines);
}

function partyError(input: PartyInput) {
  if (input.name.trim().length < 2) return "Enter a name.";
  if (input.company.trim().length < 2) return "Enter a company.";
  if (!input.email.includes("@")) return "Enter a valid email.";
  if (input.phone.trim().length < 8) return "Enter a phone number.";
  if (input.address.trim().length < 6) return "Enter an address.";
  return null;
}

export function createProduct(state: AppState, input: ProductInput, options: OperationOptions = {}): Result<AppState> {
  const name = input.name.trim();
  const sku = input.sku.trim().toUpperCase();
  if (name.length < 2) return fail("Enter a product name.");
  if (sku.length < 2) return fail("Enter a SKU.");
  if (state.products.some((product) => product.sku.toLowerCase() === sku.toLowerCase())) return fail("That SKU is already in use.");
  if (!state.settings.warehouses.includes(input.warehouse)) return fail("Select a warehouse from settings.");
  if (!Number.isInteger(input.quantity) || input.quantity < 0) return fail("Initial quantity must be a whole number.");
  if (!Number.isInteger(input.minStock) || input.minStock < 0) return fail("Minimum stock must be a whole number.");
  if (!(input.unitPrice > 0)) return fail("Selling price must be greater than zero.");
  if (input.costPrice < 0) return fail("Cost price cannot be negative.");

  const timestamp = nowIso(options.at);
  const product: Product = {
    id: options.id ?? uid("prd"),
    name,
    sku,
    category: input.category.trim(),
    description: input.description.trim(),
    unitPrice: roundMoney(input.unitPrice),
    costPrice: roundMoney(input.costPrice),
    quantity: 0,
    minStock: input.minStock,
    warehouse: input.warehouse,
    imageUrl: input.imageUrl?.trim() || undefined,
    createdAt: timestamp,
  };

  let next = ok({ ...state, products: [product, ...state.products] });
  if (!next.ok) return next;
  if (input.quantity > 0) {
    next = applyDeltas(next.data, new Map([[product.id, input.quantity]]), {
      type: "adjustment",
      referenceId: options.referenceId ?? `OPEN-${sku}`,
      date: timestamp,
      note: options.note ?? "Initial stock",
    });
    if (!next.ok) return next;
  }

  const entry = options.silent
    ? null
    : activity({
        title: "Product added",
        description: `${name} · ${sku}`,
        date: timestamp,
        entity: "product",
        entityId: product.id,
      });
  return ok(withActivity(next.data, entry));
}

export function updateProduct(state: AppState, id: string, input: ProductUpdate): Result<AppState> {
  const current = state.products.find((product) => product.id === id);
  if (!current) return fail("Product not found.");
  const sku = input.sku.trim().toUpperCase();
  if (state.products.some((product) => product.id !== id && product.sku.toLowerCase() === sku.toLowerCase())) {
    return fail("That SKU is already in use.");
  }
  if (!state.settings.warehouses.includes(input.warehouse)) return fail("Select a warehouse from settings.");
  if (!(input.unitPrice > 0)) return fail("Selling price must be greater than zero.");
  const products = state.products.map((product) =>
    product.id === id
      ? {
          ...product,
          name: input.name.trim(),
          sku,
          category: input.category.trim(),
          description: input.description.trim(),
          unitPrice: roundMoney(input.unitPrice),
          costPrice: roundMoney(input.costPrice),
          minStock: input.minStock,
          warehouse: input.warehouse,
          imageUrl: input.imageUrl?.trim() || undefined,
        }
      : product,
  );
  return ok(
    withActivity(
      { ...state, products },
      activity({ title: "Product updated", description: `${input.name.trim()} · ${sku}`, entity: "product", entityId: id }),
    ),
  );
}

export function deleteProduct(state: AppState, id: string): Result<AppState> {
  const product = state.products.find((entry) => entry.id === id);
  if (!product) return fail("Product not found.");
  const linked =
    state.sales.some((sale) => sale.items.some((item) => item.productId === id)) ||
    state.purchases.some((purchase) => purchase.items.some((item) => item.productId === id));
  if (linked) return fail("This product is on existing orders and cannot be deleted.");
  return ok({
    ...state,
    products: state.products.filter((entry) => entry.id !== id),
    stockMovements: state.stockMovements.filter((movement) => movement.productId !== id),
    activities: [
      activity({ title: "Product deleted", description: product.name, entity: "product" }),
      ...state.activities,
    ].slice(0, 300),
  });
}

export function adjustStock(state: AppState, input: AdjustmentInput, options: OperationOptions = {}): Result<AppState> {
  const product = state.products.find((entry) => entry.id === input.productId);
  if (!product) return fail("Product not found.");
  if (!Number.isInteger(input.delta) || input.delta === 0) return fail("Enter a non-zero whole quantity.");
  if (input.note.trim().length < 3) return fail("Add a short reason for the adjustment.");
  const timestamp = nowIso(options.at);
  const referenceId = options.referenceId ?? `ADJ-${product.sku}`;
  const stock = applyDeltas(state, new Map([[product.id, input.delta]]), {
    type: "adjustment",
    referenceId,
    date: timestamp,
    note: input.note.trim(),
  });
  if (!stock.ok) return stock;
  const direction = input.delta > 0 ? `+${input.delta}` : String(input.delta);
  return ok(
    withActivity(
      stock.data,
      options.silent
        ? null
        : activity({
            title: "Stock adjusted",
            description: `${product.name} · ${direction} · ${input.note.trim()}`,
            date: timestamp,
            entity: "product",
            entityId: product.id,
          }),
    ),
  );
}

function upsertParty<T extends Customer | Supplier>(input: PartyInput, id: string, createdAt: string, current?: T): T {
  return {
    ...(current ?? { id, createdAt }),
    id,
    createdAt,
    ...snapshot({ ...input }),
  } as T;
}

export function createCustomer(state: AppState, input: PartyInput, options: OperationOptions = {}): Result<AppState> {
  const error = partyError(input);
  if (error) return fail(error);
  const timestamp = nowIso(options.at);
  const customer = upsertParty<Customer>(input, options.id ?? uid("cus"), timestamp);
  return ok(
    withActivity(
      { ...state, customers: [customer, ...state.customers] },
      options.silent
        ? null
        : activity({ title: "Customer added", description: customer.company, date: timestamp, entity: "customer", entityId: customer.id }),
    ),
  );
}

export function updateCustomer(state: AppState, id: string, input: PartyInput): Result<AppState> {
  const current = state.customers.find((customer) => customer.id === id);
  if (!current) return fail("Customer not found.");
  const error = partyError(input);
  if (error) return fail(error);
  const customer = upsertParty(input, id, current.createdAt, current);
  return ok(
    withActivity(
      { ...state, customers: state.customers.map((entry) => (entry.id === id ? customer : entry)) },
      activity({ title: "Customer updated", description: customer.company, entity: "customer", entityId: id }),
    ),
  );
}

export function deleteCustomer(state: AppState, id: string): Result<AppState> {
  const customer = state.customers.find((entry) => entry.id === id);
  if (!customer) return fail("Customer not found.");
  if (state.sales.some((sale) => sale.customerId === id)) return fail("This customer has sales orders and cannot be deleted.");
  return ok({
    ...state,
    customers: state.customers.filter((entry) => entry.id !== id),
    activities: [activity({ title: "Customer deleted", description: customer.company, entity: "customer" }), ...state.activities].slice(0, 300),
  });
}

export function createSupplier(state: AppState, input: PartyInput, options: OperationOptions = {}): Result<AppState> {
  const error = partyError(input);
  if (error) return fail(error);
  const timestamp = nowIso(options.at);
  const supplier = upsertParty<Supplier>(input, options.id ?? uid("sup"), timestamp);
  return ok(
    withActivity(
      { ...state, suppliers: [supplier, ...state.suppliers] },
      options.silent
        ? null
        : activity({ title: "Supplier added", description: supplier.company, date: timestamp, entity: "supplier", entityId: supplier.id }),
    ),
  );
}

export function updateSupplier(state: AppState, id: string, input: PartyInput): Result<AppState> {
  const current = state.suppliers.find((supplier) => supplier.id === id);
  if (!current) return fail("Supplier not found.");
  const error = partyError(input);
  if (error) return fail(error);
  const supplier = upsertParty(input, id, current.createdAt, current);
  return ok(
    withActivity(
      { ...state, suppliers: state.suppliers.map((entry) => (entry.id === id ? supplier : entry)) },
      activity({ title: "Supplier updated", description: supplier.company, entity: "supplier", entityId: id }),
    ),
  );
}

export function deleteSupplier(state: AppState, id: string): Result<AppState> {
  const supplier = state.suppliers.find((entry) => entry.id === id);
  if (!supplier) return fail("Supplier not found.");
  if (state.purchases.some((purchase) => purchase.supplierId === id)) {
    return fail("This supplier has purchase orders and cannot be deleted.");
  }
  return ok({
    ...state,
    suppliers: state.suppliers.filter((entry) => entry.id !== id),
    activities: [activity({ title: "Supplier deleted", description: supplier.company, entity: "supplier" }), ...state.activities].slice(0, 300),
  });
}

function buildSale(state: AppState, input: SaleInput, existing: Sale | undefined, options: OperationOptions): Result<Sale> {
  const customer = state.customers.find((entry) => entry.id === input.customerId);
  if (!customer) return fail("Select a customer.");
  if (input.taxPercent < 0 || input.taxPercent > 100) return fail("Tax must be between 0 and 100.");
  const lines = cleanLines(state, input.items, "unit price");
  if (!lines.ok) return lines;
  const subtotal = roundMoney(lines.data.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0));
  if (input.discount < 0) return fail("Discount cannot be negative.");
  if (input.discount > subtotal) return fail("Discount cannot exceed the subtotal.");
  const totals = calculateSaleTotals(
    lines.data.map((line) => ({ quantity: line.quantity, unitPrice: line.unitPrice })),
    input.discount,
    input.taxPercent,
  );
  const timestamp = nowIso(options.at);
  return ok({
    id: existing?.id ?? options.id ?? uid("sal"),
    invoiceNumber: existing?.invoiceNumber ?? options.number ?? nextDocumentNumber(state.sales.map((sale) => sale.invoiceNumber), "INV"),
    customerId: customer.id,
    billTo: snapshot(customer),
    date: input.date,
    items: lines.data.map((line) => ({
      productId: line.product.id,
      productName: line.product.name,
      sku: line.product.sku,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
    })),
    discount: totals.discountAmount,
    taxPercent: input.taxPercent,
    subtotal: totals.subtotal,
    taxAmount: totals.taxAmount,
    grandTotal: totals.grandTotal,
    paymentStatus: input.paymentStatus,
    orderStatus: input.orderStatus,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  });
}

function saleTitle(status: Sale["orderStatus"], updating: boolean) {
  if (updating) return "Sales order updated";
  if (status === "confirmed") return "Sale confirmed";
  if (status === "cancelled") return "Sale cancelled";
  return "Sales order created";
}

export function createSale(state: AppState, input: SaleInput, options: OperationOptions = {}): Result<AppState> {
  const sale = buildSale(state, input, undefined, options);
  if (!sale.ok) return sale;
  const stock = applyDeltas(state, stockDelta(new Map(), committedSaleQty(sale.data), "out"), {
    type: "sale",
    referenceId: sale.data.invoiceNumber,
    date: nowIso(options.at),
    note: sale.data.billTo.company,
  });
  if (!stock.ok) return stock;
  return ok(
    withActivity(
      { ...stock.data, sales: [sale.data, ...stock.data.sales] },
      activity({
        title: saleTitle(sale.data.orderStatus, false),
        description: `${sale.data.invoiceNumber} · ${sale.data.billTo.company} · ${formatMoney(sale.data.grandTotal, state.settings.currency)}`,
        date: nowIso(options.at),
        entity: "sale",
        entityId: sale.data.id,
      }),
    ),
  );
}

export function updateSale(state: AppState, id: string, input: SaleInput, options: OperationOptions = {}): Result<AppState> {
  const existing = state.sales.find((sale) => sale.id === id);
  if (!existing) return fail("Sales order not found.");
  const sale = buildSale(state, input, existing, options);
  if (!sale.ok) return sale;
  const stock = applyDeltas(state, stockDelta(committedSaleQty(existing), committedSaleQty(sale.data), "out"), {
    type: "sale",
    referenceId: sale.data.invoiceNumber,
    date: nowIso(options.at),
    note: "Order revision",
  });
  if (!stock.ok) return stock;
  return ok(
    withActivity(
      { ...stock.data, sales: stock.data.sales.map((entry) => (entry.id === id ? sale.data : entry)) },
      activity({
        title: saleTitle(sale.data.orderStatus, true),
        description: `${sale.data.invoiceNumber} · ${sale.data.billTo.company} · ${formatMoney(sale.data.grandTotal, state.settings.currency)}`,
        entity: "sale",
        entityId: id,
      }),
    ),
  );
}

export function deleteSale(state: AppState, id: string): Result<AppState> {
  const existing = state.sales.find((sale) => sale.id === id);
  if (!existing) return fail("Sales order not found.");
  const stock = applyDeltas(state, stockDelta(committedSaleQty(existing), new Map(), "out"), {
    type: "sale",
    referenceId: existing.invoiceNumber,
    date: new Date().toISOString(),
    note: "Order deleted",
  });
  if (!stock.ok) return stock;
  return ok(
    withActivity(
      { ...stock.data, sales: stock.data.sales.filter((sale) => sale.id !== id) },
      activity({
        title: "Sales order deleted",
        description: `${existing.invoiceNumber} · ${existing.billTo.company}`,
        entity: "sale",
      }),
    ),
  );
}

function buildPurchase(state: AppState, input: PurchaseInput, existing: Purchase | undefined, options: OperationOptions): Result<Purchase> {
  const supplier = state.suppliers.find((entry) => entry.id === input.supplierId);
  if (!supplier) return fail("Select a supplier.");
  if (startOfDay(new Date(input.expectedDelivery)) < startOfDay(new Date(input.orderDate))) {
    return fail("Expected delivery cannot be before the order date.");
  }
  if (input.taxPercent < 0 || input.taxPercent > 100) return fail("Tax must be between 0 and 100.");
  const lines = cleanLines(state, input.items, "unit cost");
  if (!lines.ok) return lines;
  const totals = calculatePurchaseTotals(
    lines.data.map((line) => ({ quantity: line.quantity, unitPrice: line.unitPrice })),
    input.taxPercent,
  );
  const timestamp = nowIso(options.at);
  return ok({
    id: existing?.id ?? options.id ?? uid("pur"),
    poNumber: existing?.poNumber ?? options.number ?? nextDocumentNumber(state.purchases.map((purchase) => purchase.poNumber), "PO"),
    supplierId: supplier.id,
    supplier: snapshot(supplier),
    orderDate: input.orderDate,
    expectedDelivery: input.expectedDelivery,
    items: lines.data.map((line) => ({
      productId: line.product.id,
      productName: line.product.name,
      sku: line.product.sku,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
    })),
    taxPercent: input.taxPercent,
    subtotal: totals.subtotal,
    taxAmount: totals.taxAmount,
    totalAmount: totals.totalAmount,
    paymentStatus: input.paymentStatus,
    receivingStatus: input.receivingStatus,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  });
}

export function createPurchase(state: AppState, input: PurchaseInput, options: OperationOptions = {}): Result<AppState> {
  const purchase = buildPurchase(state, input, undefined, options);
  if (!purchase.ok) return purchase;
  const stock = applyDeltas(state, stockDelta(new Map(), committedPurchaseQty(purchase.data), "in"), {
    type: "purchase",
    referenceId: purchase.data.poNumber,
    date: nowIso(options.at),
    note: purchase.data.supplier.company,
  });
  if (!stock.ok) return stock;
  const received = purchase.data.receivingStatus === "received";
  return ok(
    withActivity(
      { ...stock.data, purchases: [purchase.data, ...stock.data.purchases] },
      activity({
        title: received ? "Purchase received" : "Purchase order created",
        description: `${purchase.data.poNumber} · ${purchase.data.supplier.company} · ${formatMoney(purchase.data.totalAmount, state.settings.currency)}`,
        date: nowIso(options.at),
        entity: "purchase",
        entityId: purchase.data.id,
      }),
    ),
  );
}

export function updatePurchase(state: AppState, id: string, input: PurchaseInput, options: OperationOptions = {}): Result<AppState> {
  const existing = state.purchases.find((purchase) => purchase.id === id);
  if (!existing) return fail("Purchase order not found.");
  const purchase = buildPurchase(state, input, existing, options);
  if (!purchase.ok) return purchase;
  const stock = applyDeltas(state, stockDelta(committedPurchaseQty(existing), committedPurchaseQty(purchase.data), "in"), {
    type: "purchase",
    referenceId: purchase.data.poNumber,
    date: nowIso(options.at),
    note: "Receipt revision",
  });
  if (!stock.ok) return stock;
  const receivedNow = existing.receivingStatus !== "received" && purchase.data.receivingStatus === "received";
  return ok(
    withActivity(
      { ...stock.data, purchases: stock.data.purchases.map((entry) => (entry.id === id ? purchase.data : entry)) },
      activity({
        title: receivedNow ? "Purchase received" : "Purchase order updated",
        description: `${purchase.data.poNumber} · ${purchase.data.supplier.company} · ${formatMoney(purchase.data.totalAmount, state.settings.currency)}`,
        entity: "purchase",
        entityId: id,
      }),
    ),
  );
}

export function deletePurchase(state: AppState, id: string): Result<AppState> {
  const existing = state.purchases.find((purchase) => purchase.id === id);
  if (!existing) return fail("Purchase order not found.");
  const stock = applyDeltas(state, stockDelta(committedPurchaseQty(existing), new Map(), "in"), {
    type: "purchase",
    referenceId: existing.poNumber,
    date: new Date().toISOString(),
    note: "Receipt reversed",
  });
  if (!stock.ok) return stock;
  return ok(
    withActivity(
      { ...stock.data, purchases: stock.data.purchases.filter((purchase) => purchase.id !== id) },
      activity({
        title: "Purchase order deleted",
        description: `${existing.poNumber} · ${existing.supplier.company}`,
        entity: "purchase",
      }),
    ),
  );
}

export function updateSettings(state: AppState, settings: Settings): Result<AppState> {
  if (settings.businessName.trim().length < 2) return fail("Enter a business name.");
  if (settings.taxPercent < 0 || settings.taxPercent > 100) return fail("Tax must be between 0 and 100.");
  if (settings.warehouses.length === 0) return fail("Keep at least one warehouse.");
  const unique = [...new Set(settings.warehouses.map((warehouse) => warehouse.trim()).filter(Boolean))];
  const removed = state.settings.warehouses.filter((warehouse) => !unique.includes(warehouse));
  const blocked = removed.filter((warehouse) => state.products.some((product) => product.warehouse === warehouse));
  if (blocked.length > 0) return fail(`Move products out of ${blocked.join(", ")} before removing that warehouse.`);
  return ok({
    ...state,
    settings: {
      ...settings,
      businessName: settings.businessName.trim(),
      email: settings.email.trim(),
      phone: settings.phone.trim(),
      address: settings.address.trim(),
      gstin: settings.gstin.trim().toUpperCase(),
      warehouses: unique,
    },
  });
}

export function saleToInput(sale: Sale): SaleInput {
  return {
    customerId: sale.customerId,
    date: sale.date,
    items: sale.items.map((item) => ({ productId: item.productId, quantity: item.quantity, unitPrice: item.unitPrice })),
    discount: sale.discount,
    taxPercent: sale.taxPercent,
    paymentStatus: sale.paymentStatus,
    orderStatus: sale.orderStatus,
  };
}

export function purchaseToInput(purchase: Purchase): PurchaseInput {
  return {
    supplierId: purchase.supplierId,
    orderDate: purchase.orderDate,
    expectedDelivery: purchase.expectedDelivery,
    items: purchase.items.map((item) => ({ productId: item.productId, quantity: item.quantity, unitPrice: item.unitPrice })),
    taxPercent: purchase.taxPercent,
    paymentStatus: purchase.paymentStatus,
    receivingStatus: purchase.receivingStatus,
  };
}
