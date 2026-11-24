"use client";

import { Button } from "@/components/shared/Button";
import { controlClass, Field } from "@/components/shared/FormField";
import { saleSchema, type SaleFormValues } from "@/lib/validations";
import { calculateSaleTotals, formatMoney, nextDocumentNumber, toDateInput, todayInput } from "@/lib/utils";
import type { Customer, Product, Sale, Settings } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";

export function SaleForm({
  customers,
  products,
  invoicePreview,
  settings,
  initial,
  availableFor,
  onSubmit,
  onCancel,
}: {
  customers: Customer[];
  products: Product[];
  invoicePreview: string;
  settings: Settings;
  initial?: Sale | null;
  availableFor: (productId: string) => number;
  onSubmit: (values: SaleFormValues) => void;
  onCancel: () => void;
}) {
  const form = useForm<SaleFormValues>({
    resolver: zodResolver(saleSchema),
    defaultValues: initial
      ? {
          customerId: initial.customerId,
          date: toDateInput(initial.date),
          discount: initial.discount,
          taxPercent: initial.taxPercent,
          paymentStatus: initial.paymentStatus,
          orderStatus: initial.orderStatus,
          items: initial.items.map((item) => ({ productId: item.productId, quantity: item.quantity, unitPrice: item.unitPrice })),
        }
      : {
          customerId: "",
          date: todayInput(),
          discount: 0,
          taxPercent: settings.taxPercent,
          paymentStatus: "unpaid",
          orderStatus: "confirmed",
          items: [{ productId: "", quantity: 1, unitPrice: 0 }],
        },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
  const watched = useWatch({ control: form.control });
  const totals = useMemo(() => {
    const items = (watched.items ?? []).map((item) => ({
      quantity: Number.isFinite(item?.quantity) ? Number(item?.quantity) : 0,
      unitPrice: Number.isFinite(item?.unitPrice) ? Number(item?.unitPrice) : 0,
    }));
    return calculateSaleTotals(items, Number(watched.discount) || 0, Number(watched.taxPercent) || 0);
  }, [watched]);
  const money = (value: number) => formatMoney(value, settings.currency);

  return (
    <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="rounded-lg bg-canvas px-3 py-2 text-[13px]">
        <span className="text-slate-500">Invoice</span>{" "}
        <span className="font-medium text-ink">{initial?.invoiceNumber ?? invoicePreview}</span>
        <p className="mt-1 text-[12px] text-slate-500">Confirmed orders reduce available stock. Pending and draft orders do not.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Customer" error={form.formState.errors.customerId?.message}>
          <select className={controlClass} {...form.register("customerId")}>
            <option value="">Select a customer</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.company} · {customer.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Date" error={form.formState.errors.date?.message}>
          <input type="date" className={controlClass} {...form.register("date")} />
        </Field>
        <Field label="Payment status">
          <select className={controlClass} {...form.register("paymentStatus")}>
            <option value="unpaid">Unpaid</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
          </select>
        </Field>
        <Field label="Order status">
          <select className={controlClass} {...form.register("orderStatus")}>
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </Field>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[12px] font-medium text-slate-700">Products</p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => append({ productId: "", quantity: 1, unitPrice: 0 })}
          >
            <Plus className="h-3.5 w-3.5" />
            Add line
          </Button>
        </div>
        <div className="space-y-3">
          {fields.map((field, index) => {
            const productId = watched.items?.[index]?.productId ?? "";
            const product = products.find((entry) => entry.id === productId);
            return (
              <div key={field.id} className="rounded-lg border border-line p-3">
                <div className="grid gap-3 sm:grid-cols-[1.4fr_0.6fr_0.7fr_auto]">
                  <Field label="Product" error={form.formState.errors.items?.[index]?.productId?.message}>
                    <select
                      className={controlClass}
                      {...form.register(`items.${index}.productId`)}
                      onChange={(event) => {
                        const next = products.find((entry) => entry.id === event.target.value);
                        form.setValue(`items.${index}.productId`, event.target.value, { shouldValidate: true });
                        if (next) form.setValue(`items.${index}.unitPrice`, next.unitPrice, { shouldValidate: true });
                      }}
                    >
                      <option value="">Select</option>
                      {products.map((entry) => (
                        <option key={entry.id} value={entry.id}>
                          {entry.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Qty" error={form.formState.errors.items?.[index]?.quantity?.message}>
                    <input type="number" min={1} step={1} className={controlClass} {...form.register(`items.${index}.quantity`, { valueAsNumber: true })} />
                  </Field>
                  <Field label="Unit price" error={form.formState.errors.items?.[index]?.unitPrice?.message}>
                    <input type="number" min={0} step="0.01" className={controlClass} {...form.register(`items.${index}.unitPrice`, { valueAsNumber: true })} />
                  </Field>
                  <div className="flex items-end">
                    <Button type="button" variant="ghost" size="icon" aria-label="Remove line" disabled={fields.length === 1} onClick={() => remove(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {product ? <p className="mt-2 text-[12px] text-slate-500">Available {availableFor(product.id)} · SKU {product.sku}</p> : null}
              </div>
            );
          })}
        </div>
        {form.formState.errors.items?.message ? <p className="mt-2 text-[12px] text-rose-600">{form.formState.errors.items.message}</p> : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Order discount" error={form.formState.errors.discount?.message} hint="Flat amount, applied before tax.">
          <input type="number" min={0} step="0.01" className={controlClass} {...form.register("discount", { valueAsNumber: true })} />
        </Field>
        <Field label="Tax %" error={form.formState.errors.taxPercent?.message}>
          <input type="number" min={0} max={100} step="0.01" className={controlClass} {...form.register("taxPercent", { valueAsNumber: true })} />
        </Field>
      </div>
      <dl className="grid grid-cols-2 gap-2 rounded-lg bg-canvas p-4 text-[13px]">
        <dt className="text-slate-500">Subtotal</dt>
        <dd className="text-right tabular-nums">{money(totals.subtotal)}</dd>
        <dt className="text-slate-500">Discount</dt>
        <dd className="text-right tabular-nums">{money(totals.discountAmount)}</dd>
        <dt className="text-slate-500">Tax</dt>
        <dd className="text-right tabular-nums">{money(totals.taxAmount)}</dd>
        <dt className="font-medium text-ink">Grand total</dt>
        <dd className="text-right font-semibold tabular-nums text-navy">{money(totals.grandTotal)}</dd>
      </dl>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{initial ? "Save changes" : "Create order"}</Button>
      </div>
    </form>
  );
}

export function nextInvoice(numbers: string[]) {
  return nextDocumentNumber(numbers, "INV");
}
