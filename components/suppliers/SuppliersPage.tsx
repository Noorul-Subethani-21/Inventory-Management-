"use client";

import { useIntentHandler } from "@/components/providers";
import { Button, IconButton } from "@/components/shared/Button";
import { DataTable } from "@/components/shared/DataTable";
import { ConfirmDialog, Drawer } from "@/components/shared/Modal";
import { PageHeader } from "@/components/shared/PageHeader";
import { PartyForm } from "@/components/shared/PartyForm";
import { SearchInput } from "@/components/shared/SearchInput";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useToast } from "@/components/shared/Toast";
import { RECEIVING_META } from "@/lib/constants";
import { supplierSummary } from "@/lib/metrics";
import { useStore } from "@/lib/store";
import { formatDate, formatMoney, matchesQuery } from "@/lib/utils";
import type { PartyFormValues } from "@/lib/validations";
import type { Supplier } from "@/types";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

export function SuppliersPage() {
  const { state, createSupplier, updateSupplier, deleteSupplier } = useStore();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [viewing, setViewing] = useState<Supplier | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Supplier | null>(null);

  useIntentHandler("supplier", (intent) => {
    if (intent.type === "create") {
      setEditing(null);
      setFormOpen(true);
      return;
    }
    const supplier = state?.suppliers.find((entry) => entry.id === intent.id);
    if (supplier) setViewing(supplier);
  });

  const rows = useMemo(() => {
    if (!state) return [];
    return state.suppliers
      .filter((supplier) => matchesQuery(query, [supplier.name, supplier.company, supplier.email, supplier.phone]))
      .sort((a, b) => a.company.localeCompare(b.company));
  }, [state, query]);

  if (!state) return null;
  const money = (value: number) => formatMoney(value, state.settings.currency);

  const save = (values: PartyFormValues) => {
    const result = editing ? updateSupplier(editing.id, values) : createSupplier(values);
    if (!result.ok) toast.error(result.error);
    else {
      toast.success(editing ? "Supplier updated." : "Supplier added. They can be selected on purchase orders.");
      setFormOpen(false);
      setEditing(null);
    }
  };

  return (
    <div>
      <PageHeader description="Vendors used on purchase orders. Spend is summed from orders that were not cancelled." actions={<Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="h-4 w-4" />Add supplier</Button>} />
      <DataTable
        rows={rows}
        rowKey={(row) => row.id}
        onRowClick={setViewing}
        emptyTitle="No suppliers match"
        emptyBody="Add a supplier before raising a purchase order."
        toolbar={<SearchInput value={query} onChange={setQuery} placeholder="Search suppliers" />}
        columns={[
          { id: "name", header: "Contact", sortValue: (row) => row.name, cell: (row) => row.name },
          { id: "company", header: "Company", sortValue: (row) => row.company, cell: (row) => <span className="font-medium text-ink">{row.company}</span> },
          { id: "email", header: "Email", cell: (row) => row.email },
          { id: "phone", header: "Phone", cell: (row) => row.phone },
          { id: "orders", header: "Purchase orders", align: "right", sortValue: (row) => supplierSummary(state, row.id).orders, cell: (row) => supplierSummary(state, row.id).orders },
          { id: "value", header: "Purchase amount", align: "right", sortValue: (row) => supplierSummary(state, row.id).value, cell: (row) => money(supplierSummary(state, row.id).value) },
          { id: "actions", header: "", className: "w-[120px]", cell: (row) => (
            <div className="flex justify-end" onClick={(event) => event.stopPropagation()}>
              <IconButton label="View supplier" onClick={() => setViewing(row)}><Eye className="h-4 w-4" /></IconButton>
              <IconButton label="Edit supplier" onClick={() => { setEditing(row); setFormOpen(true); }}><Pencil className="h-4 w-4" /></IconButton>
              <IconButton label="Delete supplier" danger onClick={() => setPendingDelete(row)}><Trash2 className="h-4 w-4" /></IconButton>
            </div>
          ) },
        ]}
      />
      <Drawer open={formOpen} title={editing ? "Edit supplier" : "Add supplier"} onClose={() => { setFormOpen(false); setEditing(null); }}>
        <PartyForm key={editing?.id ?? "new-supplier"} initial={editing} submitLabel={editing ? "Save supplier" : "Add supplier"} onCancel={() => { setFormOpen(false); setEditing(null); }} onSubmit={save} />
      </Drawer>
      <Drawer open={Boolean(viewing)} wide title={viewing?.company ?? "Supplier"} description={viewing?.name} onClose={() => setViewing(null)}>
        {viewing ? (
          <SupplierDetail supplier={viewing} />
        ) : null}
      </Drawer>
      <ConfirmDialog open={Boolean(pendingDelete)} title="Delete this supplier?" message="Suppliers with purchase orders stay on file so those orders keep their vendor details." confirmLabel="Delete supplier" destructive onClose={() => setPendingDelete(null)} onConfirm={() => {
        if (!pendingDelete) return;
        const result = deleteSupplier(pendingDelete.id);
        if (!result.ok) toast.error(result.error);
        else toast.success("Supplier deleted.");
        setPendingDelete(null);
      }} />
    </div>
  );
}

function SupplierDetail({ supplier }: { supplier: Supplier }) {
  const { state } = useStore();
  if (!state) return null;
  const summary = supplierSummary(state, supplier.id);
  const money = (value: number) => formatMoney(value, state.settings.currency);
  return (
    <div className="space-y-4 text-[13px]">
      <div className="grid gap-3 sm:grid-cols-2">
        <p><span className="text-slate-500">Email</span><br />{supplier.email}</p>
        <p><span className="text-slate-500">Phone</span><br />{supplier.phone}</p>
        <p className="sm:col-span-2"><span className="text-slate-500">Address</span><br />{supplier.address}</p>
        <p><span className="text-slate-500">Orders</span><br />{summary.orders}</p>
        <p><span className="text-slate-500">Amount</span><br />{money(summary.value)}</p>
      </div>
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-line text-[11px] uppercase tracking-wide text-slate-400">
            <th className="py-2 font-medium">Order</th>
            <th className="py-2 font-medium">Date</th>
            <th className="py-2 font-medium">Receiving</th>
            <th className="py-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {summary.history.length === 0 ? <tr><td colSpan={4} className="py-6 text-center text-slate-500">No purchase orders yet.</td></tr> : summary.history.map((purchase) => (
            <tr key={purchase.id} className="border-b border-[#f1f2f4]">
              <td className="py-2 font-medium text-ink">{purchase.poNumber}</td>
              <td className="py-2">{formatDate(purchase.orderDate)}</td>
              <td className="py-2"><StatusBadge tone={RECEIVING_META[purchase.receivingStatus].tone}>{RECEIVING_META[purchase.receivingStatus].label}</StatusBadge></td>
              <td className="py-2 text-right tabular-nums">{money(purchase.totalAmount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
