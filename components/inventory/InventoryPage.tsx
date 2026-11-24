"use client";

import { ProductForm } from "@/components/inventory/ProductForm";
import { useIntentHandler, useUi } from "@/components/providers";
import { Button, IconButton } from "@/components/shared/Button";
import { DataTable } from "@/components/shared/DataTable";
import { FilterDropdown, SearchInput } from "@/components/shared/SearchInput";
import { controlClass, Field } from "@/components/shared/FormField";
import { ConfirmDialog, Drawer } from "@/components/shared/Modal";
import { PageHeader } from "@/components/shared/PageHeader";
import { ProductMark } from "@/components/shared/ProductMark";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useToast } from "@/components/shared/Toast";
import { MOVEMENT_META, STOCK_META } from "@/lib/constants";
import { useStore } from "@/lib/store";
import { formatDateTime, formatMoney, formatQty, matchesQuery, stockStatusOf, stockValue } from "@/lib/utils";
import { adjustmentSchema, type AdjustmentFormValues, type ProductCreateValues, type ProductEditValues } from "@/lib/validations";
import type { Product } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, History, PackagePlus, Pencil, SlidersHorizontal, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";

export function InventoryPage() {
  const { state, createProduct, updateProduct, deleteProduct, adjustStock } = useStore();
  const toast = useToast();
  const ui = useUi();
  const [tab, setTab] = useState<"products" | "history">("products");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [warehouse, setWarehouse] = useState("all");
  const [status, setStatus] = useState("all");
  const [historyQuery, setHistoryQuery] = useState("");
  const [historyType, setHistoryType] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [viewing, setViewing] = useState<Product | null>(null);
  const [adjusting, setAdjusting] = useState<Product | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Product | null>(null);

  useIntentHandler("product", (intent) => {
    if (!state) return;
    if (intent.type === "create") {
      setEditing(null);
      setFormOpen(true);
      return;
    }
    const product = state.products.find((entry) => entry.id === intent.id);
    if (product) setViewing(product);
  });

  const categories = useMemo(() => [...new Set(state?.products.map((product) => product.category) ?? [])].sort(), [state]);
  const rows = useMemo(() => {
    if (!state) return [];
    return state.products
      .filter((product) => matchesQuery(query, [product.name, product.sku, product.category, product.warehouse]))
      .filter((product) => category === "all" || product.category === category)
      .filter((product) => warehouse === "all" || product.warehouse === warehouse)
      .filter((product) => status === "all" || stockStatusOf(product.quantity, product.minStock) === status)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [state, query, category, warehouse, status]);

  const movements = useMemo(() => {
    if (!state) return [];
    return state.stockMovements
      .filter((movement) => historyType === "all" || movement.type === historyType)
      .filter((movement) => matchesQuery(historyQuery, [movement.productName, movement.referenceId, movement.note, movement.type]))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [state, historyQuery, historyType]);

  if (!state) return null;
  const money = (value: number) => formatMoney(value, state.settings.currency);

  return (
    <div>
      <PageHeader
        description="Catalogue, on-hand quantities, and the stock ledger. Status is calculated from quantity and the minimum level."
        actions={
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <PackagePlus className="h-4 w-4" />
            Add product
          </Button>
        }
      />
      <div className="mb-4 inline-flex rounded-lg border border-line bg-white p-0.5">
        {(["products", "history"] as const).map((item) => (
          <button key={item} type="button" onClick={() => setTab(item)} className={`h-8 rounded-md px-3 text-[13px] font-medium ${tab === item ? "bg-navy text-white" : "text-slate-600"}`}>
            {item === "products" ? "Products" : "Stock history"}
          </button>
        ))}
      </div>

      {tab === "products" ? (
        <DataTable
          rows={rows}
          rowKey={(row) => row.id}
          onRowClick={setViewing}
          minWidth={1040}
          emptyTitle="No products match"
          emptyBody="Adjust the filters or add a product to the catalogue."
          toolbar={
            <>
              <SearchInput value={query} onChange={setQuery} placeholder="Search name or SKU" />
              <FilterDropdown label="Category" value={category} onChange={setCategory} options={[{ value: "all", label: "All categories" }, ...categories.map((item) => ({ value: item, label: item }))]} />
              <FilterDropdown label="Warehouse" value={warehouse} onChange={setWarehouse} options={[{ value: "all", label: "All warehouses" }, ...state.settings.warehouses.map((item) => ({ value: item, label: item }))]} />
              <FilterDropdown label="Stock status" value={status} onChange={setStatus} options={[{ value: "all", label: "All statuses" }, { value: "in_stock", label: "In stock" }, { value: "low_stock", label: "Low stock" }, { value: "out_of_stock", label: "Out of stock" }]} />
            </>
          }
          columns={[
            { id: "product", header: "Product", sortValue: (row) => row.name, cell: (row) => (
              <span className="flex items-center gap-3">
                <ProductMark category={row.category} imageUrl={row.imageUrl} name={row.name} />
                <span>
                  <span className="block font-medium text-ink">{row.name}</span>
                  <span className="block text-[12px] text-slate-400">{row.sku}</span>
                </span>
              </span>
            ) },
            { id: "category", header: "Category", sortValue: (row) => row.category, cell: (row) => row.category },
            { id: "warehouse", header: "Warehouse", sortValue: (row) => row.warehouse, cell: (row) => row.warehouse },
            { id: "qty", header: "Available", align: "right", sortValue: (row) => row.quantity, cell: (row) => formatQty(row.quantity) },
            { id: "min", header: "Minimum", align: "right", sortValue: (row) => row.minStock, cell: (row) => formatQty(row.minStock) },
            { id: "price", header: "Unit price", align: "right", sortValue: (row) => row.unitPrice, cell: (row) => money(row.unitPrice) },
            { id: "status", header: "Status", cell: (row) => {
              const stock = stockStatusOf(row.quantity, row.minStock);
              return <StatusBadge tone={STOCK_META[stock].tone}>{STOCK_META[stock].label}</StatusBadge>;
            } },
            { id: "actions", header: "", className: "w-[160px]", cell: (row) => (
              <div className="flex justify-end" onClick={(event) => event.stopPropagation()}>
                <IconButton label="View product" onClick={() => setViewing(row)}><Eye className="h-4 w-4" /></IconButton>
                <IconButton label="Adjust stock" onClick={() => setAdjusting(row)}><SlidersHorizontal className="h-4 w-4" /></IconButton>
                <IconButton label="Edit product" onClick={() => { setEditing(row); setFormOpen(true); }}><Pencil className="h-4 w-4" /></IconButton>
                <IconButton label="Delete product" danger onClick={() => setPendingDelete(row)}><Trash2 className="h-4 w-4" /></IconButton>
              </div>
            ) },
          ]}
        />
      ) : (
        <DataTable
          rows={movements}
          rowKey={(row) => row.id}
          minWidth={980}
          emptyTitle="No stock movements"
          emptyBody="Sales, receipts, and adjustments will appear here."
          toolbar={
            <>
              <SearchInput value={historyQuery} onChange={setHistoryQuery} placeholder="Search product or reference" />
              <FilterDropdown label="Transaction type" value={historyType} onChange={setHistoryType} options={[{ value: "all", label: "All types" }, { value: "purchase", label: "Purchase" }, { value: "sale", label: "Sale" }, { value: "adjustment", label: "Adjustment" }]} />
            </>
          }
          columns={[
            { id: "id", header: "Transaction", cell: (row) => <span className="font-medium text-ink">{row.referenceId}</span> },
            { id: "product", header: "Product", sortValue: (row) => row.productName, cell: (row) => state.products.find((product) => product.id === row.productId)?.name ?? row.productName },
            { id: "type", header: "Type", cell: (row) => <StatusBadge tone={MOVEMENT_META[row.type].tone}>{MOVEMENT_META[row.type].label}</StatusBadge> },
            { id: "qty", header: "Quantity changed", align: "right", sortValue: (row) => row.quantityChanged, cell: (row) => <span className={row.quantityChanged > 0 ? "text-emerald-700" : "text-rose-700"}>{row.quantityChanged > 0 ? `+${row.quantityChanged}` : row.quantityChanged}</span> },
            { id: "prev", header: "Previous", align: "right", cell: (row) => row.previousStock },
            { id: "next", header: "Current", align: "right", cell: (row) => row.currentStock },
            { id: "date", header: "Date", sortValue: (row) => row.date, cell: (row) => formatDateTime(row.date) },
          ]}
        />
      )}

      <Drawer open={formOpen} title={editing ? "Edit product" : "Add product"} description="Selling price is used on invoices. Cost price is used for inventory value." onClose={() => { setFormOpen(false); setEditing(null); }}>
        <ProductForm
          key={editing?.id ?? "new-product"}
          warehouses={state.settings.warehouses}
          initial={editing}
          onCancel={() => { setFormOpen(false); setEditing(null); }}
          onCreate={(values: ProductCreateValues) => {
            const result = createProduct({ ...values, imageUrl: values.imageUrl || undefined });
            if (!result.ok) toast.error(result.error);
            else {
              toast.success("Product added to inventory.");
              setFormOpen(false);
            }
          }}
          onUpdate={(values: ProductEditValues) => {
            if (!editing) return;
            const result = updateProduct(editing.id, { ...values, imageUrl: values.imageUrl || undefined });
            if (!result.ok) toast.error(result.error);
            else {
              toast.success("Product updated.");
              setFormOpen(false);
              setEditing(null);
            }
          }}
        />
      </Drawer>

      <Drawer open={Boolean(viewing)} title={viewing?.name ?? "Product"} description={viewing?.sku} onClose={() => setViewing(null)}>
        {viewing ? (
          <div className="space-y-4 text-[13px]">
            <div className="flex items-center gap-3">
              <ProductMark category={viewing.category} imageUrl={viewing.imageUrl} name={viewing.name} />
              <StatusBadge tone={STOCK_META[stockStatusOf(viewing.quantity, viewing.minStock)].tone}>{STOCK_META[stockStatusOf(viewing.quantity, viewing.minStock)].label}</StatusBadge>
            </div>
            <p className="leading-5 text-slate-600">{viewing.description || "No description."}</p>
            <div className="grid grid-cols-2 gap-3">
              <Info label="Available" value={formatQty(viewing.quantity)} />
              <Info label="Minimum" value={formatQty(viewing.minStock)} />
              <Info label="Selling price" value={money(viewing.unitPrice)} />
              <Info label="Cost price" value={money(viewing.costPrice)} />
              <Info label="Stock value" value={money(stockValue(viewing))} />
              <Info label="Warehouse" value={viewing.warehouse} />
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => { setAdjusting(viewing); setViewing(null); }}>Adjust stock</Button>
              <Button variant="secondary" onClick={() => ui.create("purchase", viewing.id)}>Reorder</Button>
            </div>
            <div>
              <p className="mb-2 flex items-center gap-1 text-[12px] font-medium text-slate-500"><History className="h-3.5 w-3.5" /> Recent movements</p>
              <ul className="divide-y divide-[#f1f2f4]">
                {state.stockMovements.filter((movement) => movement.productId === viewing.id).slice(0, 6).map((movement) => (
                  <li key={movement.id} className="flex items-center justify-between py-2">
                    <span>{movement.referenceId}<span className="block text-[12px] text-slate-400">{formatDateTime(movement.date)}</span></span>
                    <span className={movement.quantityChanged > 0 ? "text-emerald-700" : "text-rose-700"}>{movement.quantityChanged > 0 ? `+${movement.quantityChanged}` : movement.quantityChanged}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </Drawer>

      <Drawer open={Boolean(adjusting)} title="Adjust stock" description={adjusting ? `${adjusting.name} · ${adjusting.quantity} on hand` : undefined} onClose={() => setAdjusting(null)}>
        {adjusting ? (
          <AdjustForm
            key={adjusting.id}
            onCancel={() => setAdjusting(null)}
            onSubmit={(values) => {
              const result = adjustStock({ productId: adjusting.id, delta: values.delta, note: values.note });
              if (!result.ok) toast.error(result.error);
              else {
                toast.success("Stock adjustment posted.");
                setAdjusting(null);
              }
            }}
          />
        ) : null}
      </Drawer>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this product?"
        message="Products that already appear on a sales or purchase order cannot be deleted."
        confirmLabel="Delete product"
        destructive
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete) return;
          const result = deleteProduct(pendingDelete.id);
          if (!result.ok) toast.error(result.error);
          else toast.success("Product deleted.");
          setPendingDelete(null);
          setViewing(null);
        }}
      />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-ink">{value}</p>
    </div>
  );
}

function AdjustForm({ onSubmit, onCancel }: { onSubmit: (values: AdjustmentFormValues) => void; onCancel: () => void }) {
  const form = useForm<AdjustmentFormValues>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: { delta: 0, note: "" },
  });
  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <Field label="Quantity change" error={form.formState.errors.delta?.message} hint="Use a positive number to add stock and a negative number to remove it.">
        <input type="number" step={1} className={controlClass} {...form.register("delta", { valueAsNumber: true })} />
      </Field>
      <Field label="Reason" error={form.formState.errors.note?.message}>
        <input className={controlClass} placeholder="Cycle count, damage, sample..." {...form.register("note")} />
      </Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Post adjustment</Button>
      </div>
    </form>
  );
}
