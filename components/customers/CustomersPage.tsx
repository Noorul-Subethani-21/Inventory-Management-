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
import { ORDER_META } from "@/lib/constants";
import { customerSummary } from "@/lib/metrics";
import { useStore } from "@/lib/store";
import { formatDate, formatMoney, matchesQuery } from "@/lib/utils";
import type { Customer } from "@/types";
import type { PartyFormValues } from "@/lib/validations";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

export function CustomersPage() {
  const { state, createCustomer, updateCustomer, deleteCustomer } = useStore();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [viewing, setViewing] = useState<Customer | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Customer | null>(null);

  useIntentHandler("customer", (intent) => {
    if (!state || intent.type !== "open") {
      if (intent.type === "create") {
        setEditing(null);
        setFormOpen(true);
      }
      return;
    }
    const customer = state?.customers.find((entry) => entry.id === intent.id);
    if (customer) setViewing(customer);
  });

  const rows = useMemo(() => {
    if (!state) return [];
    return state.customers
      .filter((customer) => matchesQuery(query, [customer.name, customer.company, customer.email, customer.phone]))
      .sort((a, b) => a.company.localeCompare(b.company));
  }, [state, query]);

  if (!state) return null;
  const money = (value: number) => formatMoney(value, state.settings.currency);

  const save = (values: PartyFormValues) => {
    const result = editing ? updateCustomer(editing.id, values) : createCustomer(values);
    if (!result.ok) toast.error(result.error);
    else {
      toast.success(editing ? "Customer updated." : "Customer added. They can be selected on new sales orders.");
      setFormOpen(false);
      setEditing(null);
    }
  };

  return (
    <div>
      <PageHeader description="Accounts that can be billed from Sales. Order totals stay in sync with invoices." actions={<Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="h-4 w-4" />Add customer</Button>} />
      <DataTable
        rows={rows}
        rowKey={(row) => row.id}
        onRowClick={setViewing}
        emptyTitle="No customers match"
        emptyBody="Add a customer to make them available when creating a sales order."
        toolbar={<SearchInput value={query} onChange={setQuery} placeholder="Search customers" />}
        columns={[
          { id: "name", header: "Customer", sortValue: (row) => row.name, cell: (row) => <span className="font-medium text-ink">{row.name}</span> },
          { id: "company", header: "Company", sortValue: (row) => row.company, cell: (row) => row.company },
          { id: "email", header: "Email", cell: (row) => row.email },
          { id: "phone", header: "Phone", cell: (row) => row.phone },
          { id: "orders", header: "Orders", align: "right", sortValue: (row) => customerSummary(state, row.id).orders, cell: (row) => customerSummary(state, row.id).orders },
          { id: "value", header: "Purchase value", align: "right", sortValue: (row) => customerSummary(state, row.id).value, cell: (row) => money(customerSummary(state, row.id).value) },
          { id: "actions", header: "", className: "w-[120px]", cell: (row) => (
            <div className="flex justify-end" onClick={(event) => event.stopPropagation()}>
              <IconButton label="View customer" onClick={() => setViewing(row)}><Eye className="h-4 w-4" /></IconButton>
              <IconButton label="Edit customer" onClick={() => { setEditing(row); setFormOpen(true); }}><Pencil className="h-4 w-4" /></IconButton>
              <IconButton label="Delete customer" danger onClick={() => setPendingDelete(row)}><Trash2 className="h-4 w-4" /></IconButton>
            </div>
          ) },
        ]}
      />
      <Drawer open={formOpen} title={editing ? "Edit customer" : "Add customer"} onClose={() => { setFormOpen(false); setEditing(null); }}>
        <PartyForm key={editing?.id ?? "new-customer"} initial={editing} submitLabel={editing ? "Save customer" : "Add customer"} onCancel={() => { setFormOpen(false); setEditing(null); }} onSubmit={save} />
      </Drawer>
      <Drawer open={Boolean(viewing)} wide title={viewing?.company ?? "Customer"} description={viewing?.name} onClose={() => setViewing(null)}>
        {viewing ? <CustomerDetail customer={viewing} /> : null}
      </Drawer>
      <ConfirmDialog open={Boolean(pendingDelete)} title="Delete this customer?" message="Customers with sales orders stay on file so invoices remain intact." confirmLabel="Delete customer" destructive onClose={() => setPendingDelete(null)} onConfirm={() => {
        if (!pendingDelete) return;
        const result = deleteCustomer(pendingDelete.id);
        if (!result.ok) toast.error(result.error);
        else toast.success("Customer deleted.");
        setPendingDelete(null);
      }} />
    </div>
  );
}

function CustomerDetail({ customer }: { customer: Customer }) {
  const { state } = useStore();
  if (!state) return null;
  const summary = customerSummary(state, customer.id);
  const money = (value: number) => formatMoney(value, state.settings.currency);
  return (
    <div className="space-y-4 text-[13px]">
      <div className="grid gap-3 sm:grid-cols-2">
        <p><span className="text-slate-500">Email</span><br />{customer.email}</p>
        <p><span className="text-slate-500">Phone</span><br />{customer.phone}</p>
        <p className="sm:col-span-2"><span className="text-slate-500">Address</span><br />{customer.address}</p>
        <p><span className="text-slate-500">Orders</span><br />{summary.orders}</p>
        <p><span className="text-slate-500">Purchase value</span><br />{money(summary.value)}</p>
      </div>
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-line text-[11px] uppercase tracking-wide text-slate-400">
            <th className="py-2 font-medium">Invoice</th>
            <th className="py-2 font-medium">Date</th>
            <th className="py-2 font-medium">Status</th>
            <th className="py-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {summary.history.length === 0 ? <tr><td colSpan={4} className="py-6 text-center text-slate-500">No orders yet.</td></tr> : summary.history.map((sale) => (
            <tr key={sale.id} className="border-b border-[#f1f2f4]">
              <td className="py-2 font-medium text-ink">{sale.invoiceNumber}</td>
              <td className="py-2">{formatDate(sale.date)}</td>
              <td className="py-2"><StatusBadge tone={ORDER_META[sale.orderStatus].tone}>{ORDER_META[sale.orderStatus].label}</StatusBadge></td>
              <td className="py-2 text-right tabular-nums">{money(sale.grandTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
