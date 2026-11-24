"use client";

import { Button } from "@/components/shared/Button";
import { controlClass, Field, textareaClass } from "@/components/shared/FormField";
import { CATEGORIES } from "@/lib/constants";
import { productCreateSchema, productEditSchema, type ProductCreateValues, type ProductEditValues } from "@/lib/validations";
import type { Product } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type UseFormReturn } from "react-hook-form";

export function ProductForm({
  warehouses,
  initial,
  onCreate,
  onUpdate,
  onCancel,
}: {
  warehouses: string[];
  initial?: Product | null;
  onCreate: (values: ProductCreateValues) => void;
  onUpdate: (values: ProductEditValues) => void;
  onCancel: () => void;
}) {
  if (initial) return <EditForm product={initial} warehouses={warehouses} onSubmit={onUpdate} onCancel={onCancel} />;
  return <CreateForm warehouses={warehouses} onSubmit={onCreate} onCancel={onCancel} />;
}

function CreateForm({
  warehouses,
  onSubmit,
  onCancel,
}: {
  warehouses: string[];
  onSubmit: (values: ProductCreateValues) => void;
  onCancel: () => void;
}) {
  const form = useForm<ProductCreateValues>({
    resolver: zodResolver(productCreateSchema),
    defaultValues: { name: "", sku: "", category: CATEGORIES[0], description: "", unitPrice: 0, costPrice: 0, quantity: 0, minStock: 0, warehouse: warehouses[0] ?? "", imageUrl: "" },
  });
  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <ProductFields form={form} warehouses={warehouses} includeQuantity />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Add product</Button>
      </div>
    </form>
  );
}

function EditForm({
  product,
  warehouses,
  onSubmit,
  onCancel,
}: {
  product: Product;
  warehouses: string[];
  onSubmit: (values: ProductEditValues) => void;
  onCancel: () => void;
}) {
  const form = useForm<ProductEditValues>({
    resolver: zodResolver(productEditSchema),
    defaultValues: {
      name: product.name,
      sku: product.sku,
      category: product.category,
      description: product.description,
      unitPrice: product.unitPrice,
      costPrice: product.costPrice,
      minStock: product.minStock,
      warehouse: product.warehouse,
      imageUrl: product.imageUrl ?? "",
    },
  });
  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <p className="rounded-lg bg-canvas px-3 py-2 text-[12px] text-slate-500">On hand: {product.quantity}. Use stock adjustment to change quantity so the ledger stays intact.</p>
      <ProductFields form={form as unknown as UseFormReturn<ProductCreateValues>} warehouses={warehouses} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save product</Button>
      </div>
    </form>
  );
}

function ProductFields({
  form,
  warehouses,
  includeQuantity,
}: {
  form: UseFormReturn<ProductCreateValues>;
  warehouses: string[];
  includeQuantity?: boolean;
}) {
  const error = (name: keyof ProductCreateValues) => {
    const field = form.formState.errors[name];
    return field && "message" in field ? String(field.message ?? "") : undefined;
  };
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Product name" error={error("name")}><input className={controlClass} {...form.register("name")} /></Field>
      <Field label="SKU" error={error("sku")}><input className={controlClass} {...form.register("sku")} /></Field>
      <Field label="Category" error={error("category")}>
        <input className={controlClass} list="category-list" {...form.register("category")} />
        <datalist id="category-list">
          {CATEGORIES.map((category) => <option key={category} value={category} />)}
        </datalist>
      </Field>
      <Field label="Warehouse" error={error("warehouse")}>
        <select className={controlClass} {...form.register("warehouse")}>
          {warehouses.map((warehouse) => <option key={warehouse} value={warehouse}>{warehouse}</option>)}
        </select>
      </Field>
      <Field label="Selling price" error={error("unitPrice")}><input type="number" min={0} step="0.01" className={controlClass} {...form.register("unitPrice", { valueAsNumber: true })} /></Field>
      <Field label="Cost price" error={error("costPrice")}><input type="number" min={0} step="0.01" className={controlClass} {...form.register("costPrice", { valueAsNumber: true })} /></Field>
      {includeQuantity ? <Field label="Initial quantity" error={error("quantity")}><input type="number" min={0} step={1} className={controlClass} {...form.register("quantity", { valueAsNumber: true })} /></Field> : null}
      <Field label="Minimum stock" error={error("minStock")}><input type="number" min={0} step={1} className={controlClass} {...form.register("minStock", { valueAsNumber: true })} /></Field>
      <div className="sm:col-span-2">
        <Field label="Description" error={error("description")}><textarea className={textareaClass} {...form.register("description")} /></Field>
      </div>
      <div className="sm:col-span-2">
        <Field label="Image URL" error={error("imageUrl")} hint="Optional. Leave blank to use a category icon."><input className={controlClass} placeholder="https://" {...form.register("imageUrl")} /></Field>
      </div>
    </div>
  );
}
