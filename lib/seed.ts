import {
  adjustStock,
  createCustomer,
  createProduct,
  createPurchase,
  createSale,
  createSupplier,
  type Result,
} from "@/lib/inventory";
import type { AppState, OrderStatus, PartyInput, PaymentStatus, ReceivingStatus, Settings } from "@/types";

const WAREHOUSES = ["Bengaluru DC", "Mumbai Hub", "Delhi NCR"] as const;

const SETTINGS: Settings = {
  businessName: "Meridian Commerce",
  email: "billing@meridiancommerce.in",
  phone: "+91 80 4120 8800",
  address: "4th Floor, Prestige Cube, Koramangala, Bengaluru 560095",
  gstin: "29AADCM8432P1Z5",
  currency: "INR",
  taxPercent: 18,
  warehouses: [...WAREHOUSES],
  notifications: { lowStock: true, orders: true, purchases: true },
};

interface ProductDef {
  sku: string;
  name: string;
  category: string;
  description: string;
  unitPrice: number;
  costPrice: number;
  minStock: number;
  warehouse: (typeof WAREHOUSES)[number];
  target: number;
}

const PRODUCTS: ProductDef[] = [
  { sku: "WM-2041", name: "Wireless Mouse", category: "Peripherals", description: "2.4 GHz wireless mouse with silent switches and a USB-A receiver.", unitPrice: 1299, costPrice: 780, minStock: 15, warehouse: "Bengaluru DC", target: 22 },
  { sku: "KB-8810", name: "Mechanical Keyboard", category: "Peripherals", description: "Tenkeyless mechanical keyboard with hot-swap switches and white backlight.", unitPrice: 4499, costPrice: 2850, minStock: 10, warehouse: "Bengaluru DC", target: 8 },
  { sku: "HB-3302", name: "USB-C Hub 7-in-1", category: "Accessories", description: "HDMI, USB-A, SD, and pass-through charging in a compact aluminium hub.", unitPrice: 2199, costPrice: 1250, minStock: 12, warehouse: "Mumbai Hub", target: 17 },
  { sku: "MN-2704", name: "27\" IPS Monitor", category: "Displays", description: "27-inch QHD IPS monitor with height-adjustable stand and USB-C power.", unitPrice: 18999, costPrice: 13400, minStock: 5, warehouse: "Delhi NCR", target: 4 },
  { sku: "LS-1108", name: "Aluminium Laptop Stand", category: "Accessories", description: "Foldable aluminium stand for 11 to 16 inch laptops.", unitPrice: 1599, costPrice: 720, minStock: 20, warehouse: "Bengaluru DC", target: 55 },
  { sku: "WC-5520", name: "1080p Webcam", category: "Peripherals", description: "Full HD webcam with dual microphones and a privacy shutter.", unitPrice: 3299, costPrice: 1980, minStock: 8, warehouse: "Mumbai Hub", target: 8 },
  { sku: "HP-9044", name: "Wireless Headphones", category: "Audio", description: "Over-ear wireless headphones with hybrid noise cancellation.", unitPrice: 7499, costPrice: 4600, minStock: 8, warehouse: "Bengaluru DC", target: 12 },
  { sku: "SD-1T02", name: "1TB NVMe SSD", category: "Storage", description: "PCIe 4.0 NVMe SSD, 1TB, for workstations and laptops.", unitPrice: 6299, costPrice: 4150, minStock: 10, warehouse: "Delhi NCR", target: 13 },
  { sku: "CB-2201", name: "USB-C Cable 2m", category: "Accessories", description: "Braided 2 metre USB-C cable, 100W charging and data.", unitPrice: 499, costPrice: 180, minStock: 40, warehouse: "Mumbai Hub", target: 120 },
  { sku: "SL-1403", name: "14\" Laptop Sleeve", category: "Accessories", description: "Padded sleeve for 14-inch laptops with a magnetic flap.", unitPrice: 899, costPrice: 420, minStock: 25, warehouse: "Bengaluru DC", target: 0 },
  { sku: "KB-2204", name: "Compact Wireless Keyboard", category: "Peripherals", description: "Low-profile wireless keyboard for shared desks.", unitPrice: 1899, costPrice: 1050, minStock: 12, warehouse: "Delhi NCR", target: 13 },
  { sku: "MN-2401", name: "24\" Office Monitor", category: "Displays", description: "24-inch full HD monitor with a slim bezel for office rows.", unitPrice: 11499, costPrice: 8200, minStock: 6, warehouse: "Mumbai Hub", target: 3 },
  { sku: "SD-P1T8", name: "Portable SSD 1TB", category: "Storage", description: "Pocket SSD, 1TB, USB-C, for field teams and editors.", unitPrice: 8999, costPrice: 6100, minStock: 8, warehouse: "Delhi NCR", target: 11 },
  { sku: "SP-6601", name: "Conference Speaker", category: "Audio", description: "USB conference speakerphone for meeting rooms up to six people.", unitPrice: 5499, costPrice: 3400, minStock: 6, warehouse: "Mumbai Hub", target: 0 },
  { sku: "DK-4410", name: "USB-C Docking Station", category: "Computing", description: "Dual-display docking station with 96W laptop charging.", unitPrice: 9999, costPrice: 6800, minStock: 6, warehouse: "Bengaluru DC", target: 11 },
  { sku: "MP-1002", name: "Ergonomic Mouse Pad", category: "Accessories", description: "Extended desk pad with a stitched edge and non-slip base.", unitPrice: 699, costPrice: 280, minStock: 30, warehouse: "Bengaluru DC", target: 72 },
  { sku: "WC-4K12", name: "4K Webcam", category: "Peripherals", description: "4K webcam with autofocus for product demos and training.", unitPrice: 8499, costPrice: 5600, minStock: 5, warehouse: "Delhi NCR", target: 5 },
  { sku: "MA-3201", name: "Single Monitor Arm", category: "Accessories", description: "Gas-spring monitor arm for screens up to 32 inches.", unitPrice: 3799, costPrice: 2200, minStock: 8, warehouse: "Mumbai Hub", target: 12 },
];

const CUSTOMERS: (PartyInput & { id: string })[] = [
  { id: "cus_aarav", name: "Aarav Mehta", company: "Pixelcraft Studio", email: "aarav@pixelcraft.in", phone: "+91 98450 11220", address: "12, Indiranagar 100 Feet Road, Bengaluru 560038" },
  { id: "cus_priya", name: "Priya Nair", company: "Harbor & Co.", email: "priya@harborco.in", phone: "+91 98200 44118", address: "403, Maker Chambers, Nariman Point, Mumbai 400021" },
  { id: "cus_rohan", name: "Rohan Kapoor", company: "Northwind Labs", email: "rohan@northwindlabs.in", phone: "+91 98111 90234", address: "Plot 18, Okhla Phase II, New Delhi 110020" },
  { id: "cus_ananya", name: "Ananya Iyer", company: "Sable Retail", email: "ananya@sableretail.in", phone: "+91 98400 22871", address: "77, Cathedral Road, Chennai 600086" },
  { id: "cus_vikram", name: "Vikram Shah", company: "Orbit Systems", email: "vikram@orbitsystems.in", phone: "+91 98220 66745", address: "Baner Road, Pune 411045" },
  { id: "cus_meera", name: "Meera Joshi", company: "Linden Offices", email: "meera@lindenoffices.in", phone: "+91 98490 33102", address: "Banjara Hills, Hyderabad 500034" },
  { id: "cus_kabir", name: "Kabir Malhotra", company: "Fieldnote Design", email: "kabir@fieldnote.in", phone: "+91 98790 22014", address: "CG Road, Ahmedabad 380006" },
];

const SUPPLIERS: (PartyInput & { id: string })[] = [
  { id: "sup_vertex", name: "Ravi Deshmukh", company: "Vertex Components", email: "ravi@vertexcomponents.in", phone: "+91 22 4002 1180", address: "Andheri East, Mumbai 400069" },
  { id: "sup_cascade", name: "Sneha Reddy", company: "Cascade Electronics", email: "sneha@cascadeelec.in", phone: "+91 40 2354 7781", address: "HITEC City, Hyderabad 500081" },
  { id: "sup_lumina", name: "Arjun Patel", company: "Lumina Displays", email: "arjun@luminadisplays.in", phone: "+91 79 4008 2210", address: "SG Highway, Ahmedabad 380015" },
  { id: "sup_oakline", name: "Neha Kulkarni", company: "Oakline Peripherals", email: "neha@oakline.in", phone: "+91 20 4120 5590", address: "Kalyani Nagar, Pune 411006" },
  { id: "sup_summit", name: "Imran Qureshi", company: "Summit Storage", email: "imran@summitstorage.in", phone: "+91 120 430 2218", address: "Sector 62, Noida 201309" },
  { id: "sup_coast", name: "Divya Menon", company: "Coastline Accessories", email: "divya@coastlineacc.in", phone: "+91 484 401 2290", address: "Marine Drive, Kochi 682031" },
];

type Lines = [string, number][];

interface SaleDef {
  id: string;
  number: string;
  customerId: string;
  daysAgo: number;
  discount: number;
  payment: PaymentStatus;
  status: OrderStatus;
  items: Lines;
}

interface PurchaseDef {
  id: string;
  number: string;
  supplierId: string;
  daysAgo: number;
  leadDays: number;
  payment: PaymentStatus;
  status: ReceivingStatus;
  items: Lines;
}

const PURCHASES: PurchaseDef[] = [
  { id: "pur_24011", number: "PO-24011", supplierId: "sup_vertex", daysAgo: 90, leadDays: 6, payment: "paid", status: "received", items: [["WM-2041", 12], ["CB-2201", 40], ["MP-1002", 30]] },
  { id: "pur_24012", number: "PO-24012", supplierId: "sup_oakline", daysAgo: 76, leadDays: 5, payment: "paid", status: "received", items: [["KB-8810", 10], ["KB-2204", 12], ["HP-9044", 8]] },
  { id: "pur_24013", number: "PO-24013", supplierId: "sup_lumina", daysAgo: 63, leadDays: 8, payment: "partial", status: "received", items: [["MN-2704", 6], ["MA-3201", 6]] },
  { id: "pur_24014", number: "PO-24014", supplierId: "sup_cascade", daysAgo: 50, leadDays: 4, payment: "paid", status: "received", items: [["HB-3302", 14], ["LS-1108", 20], ["CB-2201", 20]] },
  { id: "pur_24015", number: "PO-24015", supplierId: "sup_summit", daysAgo: 40, leadDays: 7, payment: "paid", status: "received", items: [["SD-1T02", 12], ["SD-P1T8", 6], ["DK-4410", 6]] },
  { id: "pur_24016", number: "PO-24016", supplierId: "sup_oakline", daysAgo: 18, leadDays: 3, payment: "paid", status: "received", items: [["WC-5520", 8], ["WC-4K12", 4], ["CB-2201", 20]] },
  { id: "pur_24017", number: "PO-24017", supplierId: "sup_cascade", daysAgo: 5, leadDays: 2, payment: "paid", status: "received", items: [["LS-1108", 10], ["WM-2041", 8]] },
  { id: "pur_24018", number: "PO-24018", supplierId: "sup_lumina", daysAgo: 7, leadDays: 10, payment: "partial", status: "pending", items: [["MN-2401", 8], ["MN-2704", 4]] },
  { id: "pur_24019", number: "PO-24019", supplierId: "sup_coast", daysAgo: 2, leadDays: 8, payment: "unpaid", status: "pending", items: [["SL-1403", 36], ["SP-6601", 8]] },
  { id: "pur_24020", number: "PO-24020", supplierId: "sup_summit", daysAgo: 12, leadDays: 6, payment: "unpaid", status: "cancelled", items: [["DK-4410", 4]] },
];

const SALES: SaleDef[] = [
  { id: "sal_24031", number: "INV-24031", customerId: "cus_ananya", daysAgo: 34, discount: 0, payment: "paid", status: "confirmed", items: [["SD-1T02", 6], ["DK-4410", 2], ["WM-2041", 6], ["SL-1403", 10]] },
  { id: "sal_24032", number: "INV-24032", customerId: "cus_vikram", daysAgo: 30, discount: 500, payment: "partial", status: "confirmed", items: [["HP-9044", 4], ["KB-8810", 5], ["SP-6601", 3], ["SD-1T02", 4]] },
  { id: "sal_24033", number: "INV-24033", customerId: "cus_rohan", daysAgo: 26, discount: 0, payment: "paid", status: "confirmed", items: [["SL-1403", 8], ["CB-2201", 16], ["HB-3302", 8], ["MA-3201", 2]] },
  { id: "sal_24034", number: "INV-24034", customerId: "cus_priya", daysAgo: 21, discount: 0, payment: "paid", status: "confirmed", items: [["MN-2401", 2], ["LS-1108", 10], ["KB-2204", 6], ["MP-1002", 10]] },
  { id: "sal_24035", number: "INV-24035", customerId: "cus_aarav", daysAgo: 16, discount: 250, payment: "paid", status: "confirmed", items: [["WM-2041", 12], ["MP-1002", 8], ["KB-2204", 5], ["CB-2201", 14], ["WC-5520", 4]] },
  { id: "sal_24036", number: "INV-24036", customerId: "cus_kabir", daysAgo: 12, discount: 0, payment: "unpaid", status: "confirmed", items: [["DK-4410", 2], ["SP-6601", 4], ["SD-P1T8", 3], ["WC-4K12", 2]] },
  { id: "sal_24037", number: "INV-24037", customerId: "cus_meera", daysAgo: 9, discount: 0, payment: "paid", status: "confirmed", items: [["WC-5520", 5], ["WC-4K12", 2], ["HP-9044", 3], ["KB-8810", 4], ["MN-2704", 2]] },
  { id: "sal_24038", number: "INV-24038", customerId: "cus_ananya", daysAgo: 6, discount: 0, payment: "paid", status: "confirmed", items: [["HB-3302", 6], ["LS-1108", 8], ["SL-1403", 12], ["MN-2704", 3], ["MA-3201", 2]] },
  { id: "sal_24039", number: "INV-24039", customerId: "cus_vikram", daysAgo: 4, discount: 1000, payment: "partial", status: "confirmed", items: [["SD-1T02", 5], ["SD-P1T8", 3], ["MN-2401", 3], ["MA-3201", 2], ["KB-2204", 4]] },
  { id: "sal_24040", number: "INV-24040", customerId: "cus_rohan", daysAgo: 2, discount: 0, payment: "paid", status: "confirmed", items: [["MN-2704", 3], ["HB-3302", 5], ["LS-1108", 6], ["SP-6601", 2], ["WC-5520", 3]] },
  { id: "sal_24041", number: "INV-24041", customerId: "cus_priya", daysAgo: 1, discount: 0, payment: "paid", status: "confirmed", items: [["KB-8810", 3], ["HP-9044", 2], ["KB-2204", 3], ["WC-4K12", 1], ["CB-2201", 12]] },
  { id: "sal_24042", number: "INV-24042", customerId: "cus_aarav", daysAgo: 0, discount: 0, payment: "paid", status: "confirmed", items: [["WM-2041", 8], ["CB-2201", 10], ["MP-1002", 6], ["WC-5520", 2], ["LS-1108", 4]] },
  { id: "sal_24043", number: "INV-24043", customerId: "cus_kabir", daysAgo: 0, discount: 0, payment: "unpaid", status: "pending", items: [["WM-2041", 2], ["LS-1108", 5]] },
  { id: "sal_24044", number: "INV-24044", customerId: "cus_meera", daysAgo: 5, discount: 0, payment: "unpaid", status: "cancelled", items: [["HP-9044", 2], ["SD-1T02", 2]] },
];

const ADJUSTMENTS = [{ sku: "MP-1002", delta: 6, daysAgo: 15, note: "Cycle count correction after the Bengaluru rack audit" }];

function stamp(daysAgo: number, hour: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, 20, 0, 0);
  return date.toISOString();
}

function plusDays(iso: string, days: number) {
  const date = new Date(iso);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function productId(sku: string) {
  return `prd_${sku.toLowerCase().replaceAll("-", "")}`;
}

function must<T>(result: Result<T>, context: string): T {
  if (!result.ok) throw new Error(`${context}: ${result.error}`);
  return result.data;
}

function totalQty(groups: Lines[], sku: string) {
  return groups.reduce((sum, lines) => sum + lines.filter((line) => line[0] === sku).reduce((inner, line) => inner + line[1], 0), 0);
}

export function buildSeed(): AppState {
  let state: AppState = {
    products: [],
    customers: [],
    suppliers: [],
    sales: [],
    purchases: [],
    stockMovements: [],
    activities: [],
    settings: SETTINGS,
  };

  const opened = stamp(130, 9);
  for (const customer of CUSTOMERS) {
    state = must(createCustomer(state, customer, { id: customer.id, at: opened, silent: true }), customer.company);
  }
  for (const supplier of SUPPLIERS) {
    state = must(createSupplier(state, supplier, { id: supplier.id, at: opened, silent: true }), supplier.company);
  }

  const catalog = new Map(PRODUCTS.map((product) => [product.sku, product]));
  for (const product of PRODUCTS) {
    const received = totalQty(
      PURCHASES.filter((purchase) => purchase.status === "received").map((purchase) => purchase.items),
      product.sku,
    );
    const sold = totalQty(
      SALES.filter((sale) => sale.status === "confirmed").map((sale) => sale.items),
      product.sku,
    );
    const adjusted = ADJUSTMENTS.filter((entry) => entry.sku === product.sku).reduce((sum, entry) => sum + entry.delta, 0);
    const opening = product.target - received + sold - adjusted;
    if (opening < 0) throw new Error(`${product.sku} opening stock is ${opening}`);
    state = must(
      createProduct(
        state,
        {
          name: product.name,
          sku: product.sku,
          category: product.category,
          description: product.description,
          unitPrice: product.unitPrice,
          costPrice: product.costPrice,
          minStock: product.minStock,
          warehouse: product.warehouse,
          quantity: opening,
        },
        { id: productId(product.sku), at: opened, silent: true, note: "Opening balance", referenceId: `OPEN-${product.sku}` },
      ),
      product.sku,
    );
  }

  type Event =
    | { at: string; kind: "purchase"; purchase: PurchaseDef }
    | { at: string; kind: "sale"; sale: SaleDef }
    | { at: string; kind: "adjust"; sku: string; delta: number; note: string };

  const events: Event[] = [
    ...PURCHASES.map((purchase) => ({ at: stamp(purchase.daysAgo, 10), kind: "purchase" as const, purchase })),
    ...SALES.map((sale) => ({ at: stamp(sale.daysAgo, 16), kind: "sale" as const, sale })),
    ...ADJUSTMENTS.map((entry) => ({ at: stamp(entry.daysAgo, 12), kind: "adjust" as const, sku: entry.sku, delta: entry.delta, note: entry.note })),
  ];
  const rank = { purchase: 0, adjust: 1, sale: 2 };
  events.sort((a, b) => a.at.localeCompare(b.at) || rank[a.kind] - rank[b.kind]);

  for (const event of events) {
    if (event.kind === "purchase") {
      const orderDate = event.at;
      state = must(
        createPurchase(
          state,
          {
            supplierId: event.purchase.supplierId,
            orderDate,
            expectedDelivery: plusDays(orderDate, event.purchase.leadDays),
            items: event.purchase.items.map(([sku, quantity]) => ({
              productId: productId(sku),
              quantity,
              unitPrice: catalog.get(sku)!.costPrice,
            })),
            taxPercent: 18,
            paymentStatus: event.purchase.payment,
            receivingStatus: event.purchase.status,
          },
          { id: event.purchase.id, number: event.purchase.number, at: orderDate },
        ),
        event.purchase.number,
      );
    } else if (event.kind === "sale") {
      state = must(
        createSale(
          state,
          {
            customerId: event.sale.customerId,
            date: event.at,
            items: event.sale.items.map(([sku, quantity]) => ({
              productId: productId(sku),
              quantity,
              unitPrice: catalog.get(sku)!.unitPrice,
            })),
            discount: event.sale.discount,
            taxPercent: 18,
            paymentStatus: event.sale.payment,
            orderStatus: event.sale.status,
          },
          { id: event.sale.id, number: event.sale.number, at: event.at },
        ),
        event.sale.number,
      );
    } else {
      state = must(
        adjustStock(state, { productId: productId(event.sku), delta: event.delta, note: event.note }, { at: event.at, referenceId: `ADJ-${event.sku}` }),
        event.sku,
      );
    }
  }

  for (const product of PRODUCTS) {
    const saved = state.products.find((entry) => entry.sku === product.sku);
    if (!saved || saved.quantity !== product.target) {
      throw new Error(`${product.sku} reconciled to ${saved?.quantity ?? "missing"}, expected ${product.target}`);
    }
  }

  return state;
}
