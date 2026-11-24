"use client";

import { Button } from "@/components/shared/Button";
import { controlClass, Field } from "@/components/shared/FormField";
import { purchaseSchema, type PurchaseFormValues } from "@/lib/validations";
import { calculatePurchaseTotals, formatMoney, nextDocumentNumber, toDateInput, todayInput } from "@/lib/utils";
import type { Product, Purchase, Settings, Supplier } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";

export function PurchaseForm({
  suppliers,
  products,
  preview,
  settings,
  initial,
  prefillProductId,
  onSubmit,
  onCancel,
}: {
  suppliers: Supplier[];
  products: Product[];
  preview: string;
  settings: Settings;
  initial?: Purchase | null;
  prefillProductId?: string;
  onSubmit: (values: PurchaseFormValues) => void;
  onCancel: () => void;
}) {
  const prefill = products.find((product) => product.id === prefillProductId);
  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: initial
      ? {
          supplierId: initial.supplierId,
          orderDate: toDateInput(initial.orderDate),
          expectedDelivery: toDateInput(initial.expectedDelivery),
          taxPercent: initial.taxPercent,
          paymentStatus: initial.paymentStatus,
          receivingStatus: initial.receivingStatus,
          items: initial.items.map((item) => ({ productId: item.productId, quantity: item.quantity, unitPrice: item.unitPrice })),
        }
      : {
          supplierId: "",
          orderDate: todayInput(),
          expectedDelivery: todayInput(),
          taxPercent: settings.taxPercent,
          paymentStatus: "unpaid",
          receivingStatus: "pending",
          items: [{ productId: prefill?.id ?? "", quantity: 1, unitPrice: prefill?.costPrice ?? 0 }],
        },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
  const watched = useWatch({ control: form.control });
  const totals = useMemo(() => {
    const items = (watched.items ?? []).map((item) => ({
      quantity: Number.isFinite(item?.quantity) ? Number(item?.quantity) : 0,
      unitPrice: Number.isFinite(item?.unitPrice) ? Number(item?.unitPrice) : 0,
    }));
    return calculatePurchaseTotals(items, Number(watched.taxPercent) || 0);
  }, [watched]);
  const money = (value: number) => formatMoney(value, settings.currency);

  return (
    <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="rounded-lg bg-canvas px-3 py-2 text-[13px]">
        <span className="text-slate-500">Purchase order</span> <span className="font-medium text-ink">{initial?.poNumber ?? preview}</span>
        <p className="mt-1 text-[12px] text-slate-500">Stock increases only when the order is marked Received. Saving it again does not add the same quantity twice.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Supplier" error={form.formState.errors.supplierId?.message}>
          <select className={controlClass} {...form.register("supplierId")}>
            <option value="">Select a supplier</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.company}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Order date" error={form.formState.errors.orderDate?.message}>
          <input type="date" className={controlClass} {...form.register("orderDate")} />
        </Field>
        <Field label="Expected delivery" error={form.formState.errors.expectedDelivery?.message}>
          <input type="date" className={controlClass} {...form.register("expectedDelivery")} />
        </Field>
        <Field label="Payment status">
          <select className={controlClass} {...form.register("paymentStatus")}>
            <option value="unpaid">Unpaid</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
          </select>
        </Field>
        <Field label="Receiving status" hint="Partial receipts do not change stock.">
          <select className={controlClass} {...form.register("receivingStatus")}>
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
            <option value="received">Received</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </Field>
        <Field label="Tax %" error={form.formState.errors.taxPercent?.message}>
          <input type="number" min={0} max={100} step="0.01" className={controlClass} {...form.register("taxPercent", { valueAsNumber: true })} />
        </Field>
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[12px] font-medium text-slate-700">Products</p>
          <Button type="button" variant="secondary" size="sm" onClick={() => append({ productId: "", quantity: 1, unitPrice: 0 })}>
            <Plus className="h-3.5 w-3.5" />
            Add line
          </Button>
        </div>
        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="grid gap-3 rounded-lg border border-line p-3 sm:grid-cols-[1.4fr_0.6fr_0.7fr_auto]">
              <Field label="Product" error={form.formState.errors.items?.[index]?.productId?.message}>
                <select
                  className={controlClass}
                  {...form.register(`items.${index}.productId`)}
                  onChange={(event) => {
                    const next = products.find((entry) => entry.id === event.target.value);
                    form.setValue(`items.${index}.productId`, event.target.value, { shouldValidate: true });
                    if (next) form.setValue(`items.${index}.unitPrice`, next.costPrice, { shouldValidate: true });
                  }}
                >
                  <option value="">Select</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Qty" error={form.formState.errors.items?.[index]?.quantity?.message}>
                <input type="number" min={1} step={1} className={controlClass} {...form.register(`items.${index}.quantity`, { valueAsNumber: true })} />
              </Field>
              <Field label="Unit cost" error={form.formState.errors.items?.[index]?.unitPrice?.message}>
                <input type="number" min={0} step="0.01" className={controlClass} {...form.register(`items.${index}.unitPrice`, { valueAsNumber: true })} />
              </Field>
              <div className="flex items-end">
                <Button type="button" variant="ghost" size="icon" aria-label="Remove line" disabled={fields.length === 1} onClick={() => remove(index)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-2 rounded-lg bg-canvas p-4 text-[13px]">
        <dt className="text-slate-500">Subtotal</dt>
        <dd className="text-right tabular-nums">{money(totals.subtotal)}</dd>
        <dt className="text-slate-500">Tax</dt>
        <dd className="text-right tabular-nums">{money(totals.taxAmount)}</dd>
        <dt className="font-medium text-ink">Total</dt>
        <dd className="text-right font-semibold tabular-nums text-navy">{money(totals.totalAmount)}</dd>
      </dl>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{initial ? "Save changes" : "Create purchase"}</Button>
      </div>
    </form>
  );
}

export function nextPurchaseNumber(numbers: string[]) {
  return nextDocumentNumber(numbers, "PO");
}
