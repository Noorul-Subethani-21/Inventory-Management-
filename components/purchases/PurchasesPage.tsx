"use client";

import { nextPurchaseNumber, PurchaseForm } from "@/components/purchases/PurchaseForm";
import { useIntentHandler } from "@/components/providers";
import { Button, IconButton } from "@/components/shared/Button";
import { DataTable } from "@/components/shared/DataTable";
import { FilterDropdown, SearchInput } from "@/components/shared/SearchInput";
import { ConfirmDialog, Drawer } from "@/components/shared/Modal";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useToast } from "@/components/shared/Toast";
import { PAYMENT_META, RECEIVING_META } from "@/lib/constants";
import { purchaseToInput } from "@/lib/inventory";
import { useStore } from "@/lib/store";
import { formatDate, formatMoney, fromDateInput, matchesQuery, productSummary, toDateInput } from "@/lib/utils";
import type { PurchaseFormValues } from "@/lib/validations";
import type { Purchase, PurchaseInput } from "@/types";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

export function PurchasesPage() {
  const { state, createPurchase, updatePurchase, deletePurchase } = useStore();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [supplierId, setSupplierId] = useState("all");
  const [receiving, setReceiving] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Purchase | null>(null);
  const [viewing, setViewing] = useState<Purchase | null>(null);
  const [prefill, setPrefill] = useState<string | undefined>();
  const [pendingDelete, setPendingDelete] = useState<Purchase | null>(null);

  useIntentHandler("purchase", (intent) => {
    if (!state) return;
    if (intent.type === "create") {
      setEditing(null);
      setViewing(null);
      setPrefill(intent.productId);
      setFormOpen(true);
      return;
    }
    const purchase = state.purchases.find((entry) => entry.id === intent.id);
    if (purchase) setViewing(purchase);
  });

  const rows = useMemo(() => {
    if (!state) return [];
    return state.purchases
      .filter((purchase) => matchesQuery(query, [purchase.poNumber, purchase.supplier.company, purchase.supplier.name, ...purchase.items.map((item) => item.productName)]))
      .filter((purchase) => supplierId === "all" || purchase.supplierId === supplierId)
      .filter((purchase) => receiving === "all" || purchase.receivingStatus === receiving)
      .filter((purchase) => !from || toDateInput(purchase.orderDate) >= from)
      .filter((purchase) => !to || toDateInput(purchase.orderDate) <= to)
      .sort((a, b) => b.orderDate.localeCompare(a.orderDate));
  }, [state, query, supplierId, receiving, from, to]);

  if (!state) return null;
  const money = (value: number) => formatMoney(value, state.settings.currency);
  const overdue = (purchase: Purchase) => purchase.receivingStatus === "pending" && new Date(purchase.expectedDelivery) < new Date(new Date().setHours(0, 0, 0, 0));

  const save = (values: PurchaseFormValues) => {
    const input: PurchaseInput = {
      ...values,
      orderDate: fromDateInput(values.orderDate),
      expectedDelivery: fromDateInput(values.expectedDelivery),
    };
    const result = editing ? updatePurchase(editing.id, input) : createPurchase(input);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(values.receivingStatus === "received" ? "Purchase saved. Stock reflects the received quantity." : "Purchase order saved.");
    setFormOpen(false);
    setEditing(null);
    setPrefill(undefined);
  };

  const receive = (purchase: Purchase) => {
    const result = updatePurchase(purchase.id, { ...purchaseToInput(purchase), receivingStatus: "received" });
    if (!result.ok) toast.error(result.error);
    else {
      toast.success("Goods received and stock increased.");
      setViewing(null);
    }
  };

  return (
    <div>
      <PageHeader
        description="Supplier orders for replenishment. Mark an order Received when the full quantity arrives."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setPrefill(undefined);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            New purchase
          </Button>
        }
      />
      <DataTable
        rows={rows}
        rowKey={(row) => row.id}
        onRowClick={setViewing}
        minWidth={980}
        emptyTitle="No purchase orders match"
        emptyBody="Create a purchase order to bring stock in from a supplier."
        toolbar={
          <>
            <SearchInput value={query} onChange={setQuery} placeholder="Search orders or suppliers" />
            <input aria-label="From date" type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="h-9 rounded-lg border border-line px-3 text-[13px]" />
            <input aria-label="To date" type="date" value={to} onChange={(event) => setTo(event.target.value)} className="h-9 rounded-lg border border-line px-3 text-[13px]" />
            <FilterDropdown
              label="Supplier"
              value={supplierId}
              onChange={setSupplierId}
              options={[{ value: "all", label: "All suppliers" }, ...state.suppliers.map((supplier) => ({ value: supplier.id, label: supplier.company }))]}
            />
            <FilterDropdown
              label="Receiving status"
              value={receiving}
              onChange={setReceiving}
              options={[
                { value: "all", label: "All receipts" },
                { value: "pending", label: "Pending" },
                { value: "partial", label: "Partial" },
                { value: "received", label: "Received" },
                { value: "cancelled", label: "Cancelled" },
              ]}
            />
          </>
        }
        columns={[
          { id: "po", header: "Purchase ID", sortValue: (row) => row.poNumber, cell: (row) => <span className="font-medium text-ink">{row.poNumber}</span> },
          { id: "supplier", header: "Supplier", sortValue: (row) => row.supplier.company, cell: (row) => row.supplier.company },
          { id: "date", header: "Order date", sortValue: (row) => row.orderDate, cell: (row) => formatDate(row.orderDate) },
          {
            id: "expected",
            header: "Expected delivery",
            sortValue: (row) => row.expectedDelivery,
            cell: (row) => (
              <span>
                {formatDate(row.expectedDelivery)}
                {overdue(row) ? <span className="ml-2 text-[12px] text-amber-700">Overdue</span> : null}
              </span>
            ),
          },
          { id: "products", header: "Products", cell: (row) => productSummary(row.items) },
          { id: "total", header: "Total", align: "right", sortValue: (row) => row.totalAmount, cell: (row) => money(row.totalAmount) },
          { id: "payment", header: "Payment", cell: (row) => <StatusBadge tone={PAYMENT_META[row.paymentStatus].tone}>{PAYMENT_META[row.paymentStatus].label}</StatusBadge> },
          { id: "status", header: "Receiving", cell: (row) => <StatusBadge tone={RECEIVING_META[row.receivingStatus].tone}>{RECEIVING_META[row.receivingStatus].label}</StatusBadge> },
          {
            id: "actions",
            header: "",
            className: "w-[140px]",
            cell: (row) => (
              <div className="flex justify-end" onClick={(event) => event.stopPropagation()}>
                <IconButton label="View purchase" onClick={() => setViewing(row)}><Eye className="h-4 w-4" /></IconButton>
                <IconButton label="Edit purchase" onClick={() => { setEditing(row); setFormOpen(true); }}><Pencil className="h-4 w-4" /></IconButton>
                <IconButton label="Delete purchase" danger onClick={() => setPendingDelete(row)}><Trash2 className="h-4 w-4" /></IconButton>
              </div>
            ),
          },
        ]}
      />

      <Drawer open={formOpen} wide title={editing ? `Edit ${editing.poNumber}` : "New purchase order"} description="Record what was ordered, from whom, and whether it has been received." onClose={() => { setFormOpen(false); setEditing(null); }}>
        <PurchaseForm
          key={`${editing?.id ?? "new"}-${prefill ?? ""}`}
          suppliers={state.suppliers}
          products={state.products}
          settings={state.settings}
          initial={editing}
          prefillProductId={prefill}
          preview={nextPurchaseNumber(state.purchases.map((purchase) => purchase.poNumber))}
          onCancel={() => { setFormOpen(false); setEditing(null); }}
          onSubmit={save}
        />
      </Drawer>

      <Drawer open={Boolean(viewing)} wide title={viewing?.poNumber ?? "Purchase"} description={viewing?.supplier.company} onClose={() => setViewing(null)}>
        {viewing ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {viewing.receivingStatus === "pending" || viewing.receivingStatus === "partial" ? <Button onClick={() => receive(viewing)}>Mark as received</Button> : null}
              <Button variant="secondary" onClick={() => { setEditing(viewing); setViewing(null); setFormOpen(true); }}>Edit</Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 text-[13px]">
              <p><span className="text-slate-500">Ordered</span><br />{formatDate(viewing.orderDate)}</p>
              <p><span className="text-slate-500">Expected</span><br />{formatDate(viewing.expectedDelivery)}</p>
              <p><span className="text-slate-500">Supplier</span><br />{viewing.supplier.name}<br />{viewing.supplier.email}</p>
              <p><span className="text-slate-500">Address</span><br />{viewing.supplier.address}</p>
            </div>
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="py-2 font-medium">Product</th>
                  <th className="py-2 font-medium">Qty</th>
                  <th className="py-2 text-right font-medium">Cost</th>
                </tr>
              </thead>
              <tbody>
                {viewing.items.map((item) => (
                  <tr key={item.productId} className="border-b border-[#f1f2f4]">
                    <td className="py-2">{item.productName}<span className="block text-[12px] text-slate-400">{item.sku}</span></td>
                    <td className="py-2">{item.quantity}</td>
                    <td className="py-2 text-right tabular-nums">{money(item.unitPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-right text-[14px] font-semibold tabular-nums">Total {money(viewing.totalAmount)}</p>
          </div>
        ) : null}
      </Drawer>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this purchase order?"
        message="If the order was received, the quantities will be removed from stock when there is enough on hand."
        confirmLabel="Delete purchase"
        destructive
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete) return;
          const result = deletePurchase(pendingDelete.id);
          if (!result.ok) toast.error(result.error);
          else toast.success("Purchase order deleted.");
          setPendingDelete(null);
          setViewing(null);
        }}
      />
    </div>
  );
}
