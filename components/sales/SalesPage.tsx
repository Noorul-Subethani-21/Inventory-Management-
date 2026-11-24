"use client";

import { nextInvoice, SaleForm } from "@/components/sales/SaleForm";
import { useIntentHandler } from "@/components/providers";
import { Button, IconButton } from "@/components/shared/Button";
import { DataTable } from "@/components/shared/DataTable";
import { FilterDropdown, SearchInput } from "@/components/shared/SearchInput";
import { ConfirmDialog, Drawer } from "@/components/shared/Modal";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useToast } from "@/components/shared/Toast";
import { ORDER_META, PAYMENT_META } from "@/lib/constants";
import { printNode } from "@/lib/print";
import { saleToInput } from "@/lib/inventory";
import { useStore } from "@/lib/store";
import { formatDate, formatMoney, fromDateInput, matchesQuery, productSummary, toDateInput } from "@/lib/utils";
import type { Sale, SaleInput } from "@/types";
import type { SaleFormValues } from "@/lib/validations";
import { Eye, Pencil, Plus, Printer, Trash2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";

export function SalesPage() {
  const { state, createSale, updateSale, deleteSale } = useStore();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [payment, setPayment] = useState("all");
  const [order, setOrder] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Sale | null>(null);
  const [viewing, setViewing] = useState<Sale | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Sale | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useIntentHandler("sale", (intent) => {
    if (!state) return;
    if (intent.type === "create") {
      setEditing(null);
      setViewing(null);
      setFormOpen(true);
      return;
    }
    const sale = state.sales.find((entry) => entry.id === intent.id);
    if (sale) setViewing(sale);
  });

  const rows = useMemo(() => {
    if (!state) return [];
    return state.sales
      .filter((sale) => matchesQuery(query, [sale.invoiceNumber, sale.billTo.company, sale.billTo.name, ...sale.items.map((item) => item.productName)]))
      .filter((sale) => payment === "all" || sale.paymentStatus === payment)
      .filter((sale) => order === "all" || sale.orderStatus === order)
      .filter((sale) => !from || toDateInput(sale.date) >= from)
      .filter((sale) => !to || toDateInput(sale.date) <= to)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [state, query, payment, order, from, to]);

  if (!state) return null;
  const money = (value: number) => formatMoney(value, state.settings.currency);

  const availableFor = (productId: string) => {
    const product = state.products.find((entry) => entry.id === productId);
    const held =
      editing?.orderStatus === "confirmed"
        ? editing.items.filter((item) => item.productId === productId).reduce((sum, item) => sum + item.quantity, 0)
        : 0;
    return (product?.quantity ?? 0) + held;
  };

  const save = (values: SaleFormValues) => {
    const input: SaleInput = { ...values, date: fromDateInput(values.date) };
    const result = editing ? updateSale(editing.id, input) : createSale(input);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(editing ? "Sales order updated." : values.orderStatus === "confirmed" ? "Sales order confirmed and stock updated." : "Sales order saved.");
    setFormOpen(false);
    setEditing(null);
  };

  const confirmSale = (sale: Sale) => {
    const result = updateSale(sale.id, { ...saleToInput(sale), orderStatus: "confirmed" });
    if (!result.ok) toast.error(result.error);
    else {
      toast.success("Order confirmed and stock reduced.");
      setViewing(null);
    }
  };

  return (
    <div>
      <PageHeader
        description="Invoices for Meridian Commerce. Confirming an order reserves stock and writes a ledger entry."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            New sales order
          </Button>
        }
      />
      <DataTable
        rows={rows}
        rowKey={(row) => row.id}
        onRowClick={setViewing}
        emptyTitle={query || payment !== "all" || order !== "all" || from || to ? "No invoices match" : "No sales orders yet"}
        emptyBody="Create a sales order to invoice a customer and update stock."
        toolbar={
          <>
            <SearchInput value={query} onChange={setQuery} placeholder="Search invoices or customers" />
            <input aria-label="From date" type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="h-9 rounded-lg border border-line px-3 text-[13px]" />
            <input aria-label="To date" type="date" value={to} onChange={(event) => setTo(event.target.value)} className="h-9 rounded-lg border border-line px-3 text-[13px]" />
            <FilterDropdown
              label="Payment status"
              value={payment}
              onChange={setPayment}
              options={[
                { value: "all", label: "All payments" },
                { value: "paid", label: "Paid" },
                { value: "partial", label: "Partial" },
                { value: "unpaid", label: "Unpaid" },
              ]}
            />
            <FilterDropdown
              label="Order status"
              value={order}
              onChange={setOrder}
              options={[
                { value: "all", label: "All orders" },
                { value: "confirmed", label: "Confirmed" },
                { value: "pending", label: "Pending" },
                { value: "draft", label: "Draft" },
                { value: "cancelled", label: "Cancelled" },
              ]}
            />
          </>
        }
        columns={[
          { id: "invoice", header: "Invoice", sortValue: (row) => row.invoiceNumber, cell: (row) => <span className="font-medium text-ink">{row.invoiceNumber}</span> },
          { id: "customer", header: "Customer", sortValue: (row) => row.billTo.company, cell: (row) => row.billTo.company },
          { id: "date", header: "Date", sortValue: (row) => row.date, cell: (row) => formatDate(row.date) },
          { id: "products", header: "Products", cell: (row) => <span title={row.items.map((item) => item.productName).join(", ")}>{productSummary(row.items)}</span> },
          { id: "total", header: "Total", align: "right", sortValue: (row) => row.grandTotal, cell: (row) => money(row.grandTotal) },
          { id: "payment", header: "Payment", cell: (row) => <StatusBadge tone={PAYMENT_META[row.paymentStatus].tone}>{PAYMENT_META[row.paymentStatus].label}</StatusBadge> },
          { id: "status", header: "Order", cell: (row) => <StatusBadge tone={ORDER_META[row.orderStatus].tone}>{ORDER_META[row.orderStatus].label}</StatusBadge> },
          {
            id: "actions",
            header: "",
            className: "w-[140px]",
            cell: (row) => (
              <div className="flex justify-end" onClick={(event) => event.stopPropagation()}>
                <IconButton label="View invoice" onClick={() => setViewing(row)}>
                  <Eye className="h-4 w-4" />
                </IconButton>
                <IconButton
                  label="Edit order"
                  onClick={() => {
                    setEditing(row);
                    setFormOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </IconButton>
                <IconButton label="Delete order" danger onClick={() => setPendingDelete(row)}>
                  <Trash2 className="h-4 w-4" />
                </IconButton>
              </div>
            ),
          },
        ]}
      />

      <Drawer
        open={formOpen}
        wide
        title={editing ? `Edit ${editing.invoiceNumber}` : "New sales order"}
        description="Choose a customer, add products, and set payment and fulfilment status."
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
      >
        <SaleForm
          key={editing?.id ?? "new-sale"}
          customers={state.customers}
          products={state.products}
          settings={state.settings}
          initial={editing}
          invoicePreview={nextInvoice(state.sales.map((sale) => sale.invoiceNumber))}
          availableFor={availableFor}
          onCancel={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          onSubmit={save}
        />
      </Drawer>

      <Drawer open={Boolean(viewing)} wide title={viewing?.invoiceNumber ?? "Invoice"} description="Bill to the customer recorded on this invoice." onClose={() => setViewing(null)}>
        {viewing ? (
          <div>
            <div className="mb-4 flex flex-wrap gap-2 no-print">
              <Button variant="secondary" onClick={() => printRef.current && printNode(printRef.current, viewing.invoiceNumber)}>
                <Printer className="h-4 w-4" />
                Print
              </Button>
              {viewing.orderStatus === "pending" || viewing.orderStatus === "draft" ? (
                <Button onClick={() => confirmSale(viewing)}>Confirm order</Button>
              ) : null}
              <Button
                variant="secondary"
                onClick={() => {
                  setEditing(viewing);
                  setViewing(null);
                  setFormOpen(true);
                }}
              >
                Edit
              </Button>
            </div>
            <article ref={printRef}>
              <Invoice sale={viewing} business={state.settings} money={money} />
            </article>
          </div>
        ) : null}
      </Drawer>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this sales order?"
        message={
          pendingDelete?.orderStatus === "confirmed"
            ? "The invoice will be removed and its quantities will be returned to stock."
            : "The invoice will be removed from the workspace."
        }
        confirmLabel="Delete order"
        destructive
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete) return;
          const result = deleteSale(pendingDelete.id);
          if (!result.ok) toast.error(result.error);
          else toast.success("Sales order deleted.");
          setPendingDelete(null);
          setViewing(null);
        }}
      />
    </div>
  );
}

function Invoice({
  sale,
  business,
  money,
}: {
  sale: Sale;
  business: { businessName: string; address: string; email: string; phone: string; gstin: string };
  money: (value: number) => string;
}) {
  return (
    <div className="rounded-xl border border-line p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[16px] font-semibold text-navy">{business.businessName}</p>
          <p className="mt-1 max-w-xs text-[12px] leading-5 text-slate-500">{business.address}</p>
          <p className="text-[12px] text-slate-500">{business.email} · {business.phone}</p>
          <p className="text-[12px] text-slate-500">GSTIN {business.gstin}</p>
        </div>
        <div className="text-right">
          <p className="text-[12px] uppercase tracking-wide text-slate-400">Tax invoice</p>
          <p className="text-[16px] font-semibold text-ink">{sale.invoiceNumber}</p>
          <p className="text-[12px] text-slate-500">{formatDate(sale.date)}</p>
        </div>
      </div>
      <div className="mt-5 grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Bill to</p>
          <p className="mt-1 text-[13px] font-medium text-ink">{sale.billTo.company}</p>
          <p className="text-[12px] text-slate-500">{sale.billTo.name}</p>
          <p className="text-[12px] text-slate-500">{sale.billTo.address}</p>
          <p className="text-[12px] text-slate-500">{sale.billTo.email}</p>
        </div>
        <div className="flex gap-2 sm:justify-end">
          <StatusBadge tone={ORDER_META[sale.orderStatus].tone}>{ORDER_META[sale.orderStatus].label}</StatusBadge>
          <StatusBadge tone={PAYMENT_META[sale.paymentStatus].tone}>{PAYMENT_META[sale.paymentStatus].label}</StatusBadge>
        </div>
      </div>
      <table className="mt-5 w-full text-left">
        <thead>
          <tr className="border-b border-line text-[11px] uppercase tracking-wide text-slate-400">
            <th className="py-2 font-medium">Item</th>
            <th className="py-2 font-medium">Qty</th>
            <th className="py-2 text-right font-medium">Rate</th>
            <th className="py-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {sale.items.map((item) => (
            <tr key={`${item.productId}-${item.sku}`} className="border-b border-[#f1f2f4]">
              <td className="py-2 text-[13px]">
                <span className="block text-ink">{item.productName}</span>
                <span className="text-[12px] text-slate-400">{item.sku}</span>
              </td>
              <td className="py-2 text-[13px]">{item.quantity}</td>
              <td className="py-2 text-right text-[13px] tabular-nums">{money(item.unitPrice)}</td>
              <td className="py-2 text-right text-[13px] tabular-nums">{money(item.quantity * item.unitPrice)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl className="ml-auto mt-4 w-full max-w-xs space-y-1 text-[13px]">
        <div className="flex justify-between"><dt className="text-slate-500">Subtotal</dt><dd className="tabular-nums">{money(sale.subtotal)}</dd></div>
        <div className="flex justify-between"><dt className="text-slate-500">Discount</dt><dd className="tabular-nums">{money(sale.discount)}</dd></div>
        <div className="flex justify-between"><dt className="text-slate-500">GST {sale.taxPercent}%</dt><dd className="tabular-nums">{money(sale.taxAmount)}</dd></div>
        <div className="flex justify-between border-t border-line pt-2 font-semibold text-ink"><dt>Grand total</dt><dd className="tabular-nums">{money(sale.grandTotal)}</dd></div>
      </dl>
    </div>
  );
}
