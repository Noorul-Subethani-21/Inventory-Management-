"use client";

import { Button } from "@/components/shared/Button";
import { controlClass, Field, textareaClass } from "@/components/shared/FormField";
import { ConfirmDialog } from "@/components/shared/Modal";
import { PageHeader } from "@/components/shared/PageHeader";
import { useToast } from "@/components/shared/Toast";
import { CURRENCIES } from "@/lib/constants";
import { useStore } from "@/lib/store";
import { settingsSchema, type SettingsFormValues } from "@/lib/validations";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";

export function SettingsPage() {
  const { state, updateSettings, resetData } = useStore();
  const toast = useToast();
  const [confirmReset, setConfirmReset] = useState(false);
  const [warehouseName, setWarehouseName] = useState("");
  if (!state) return null;

  return (
    <div className="max-w-3xl">
      <PageHeader description="Company details appear on printed invoices. Tax is the default for new orders." />
      <SettingsForm
        key={state.settings.businessName + state.settings.currency + state.settings.warehouses.join("|")}
        initial={state.settings}
        warehouseName={warehouseName}
        setWarehouseName={setWarehouseName}
        onSubmit={(values) => {
          const result = updateSettings(values);
          if (!result.ok) toast.error(result.error);
          else toast.success("Workspace settings saved.");
        }}
      />
      <section className="mt-6 rounded-xl border border-rose-200 bg-white p-5">
        <h2 className="text-[14px] font-semibold text-ink">Restore sample data</h2>
        <p className="mt-1 text-[13px] leading-5 text-slate-500">Replaces everything in this browser with the original Meridian Commerce sample. This cannot be undone.</p>
        <Button className="mt-4" variant="danger" onClick={() => setConfirmReset(true)}>Restore sample data</Button>
      </section>
      <ConfirmDialog
        open={confirmReset}
        title="Restore the sample workspace?"
        message="Your products, orders, and settings in this browser will be replaced with the original sample."
        confirmLabel="Restore data"
        destructive
        onClose={() => setConfirmReset(false)}
        onConfirm={() => {
          resetData();
          setConfirmReset(false);
          toast.success("Sample data restored.");
        }}
      />
    </div>
  );
}

function SettingsForm({
  initial,
  warehouseName,
  setWarehouseName,
  onSubmit,
}: {
  initial: SettingsFormValues;
  warehouseName: string;
  setWarehouseName: (value: string) => void;
  onSubmit: (values: SettingsFormValues) => void;
}) {
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: initial,
  });
  const watched = useWatch({ control: form.control, name: "warehouses" });
  const list = watched ?? initial.warehouses;

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <section className="rounded-xl border border-line bg-white p-5">
        <h2 className="text-[14px] font-semibold text-ink">Company</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Business name" error={form.formState.errors.businessName?.message}><input className={controlClass} {...form.register("businessName")} /></Field>
          <Field label="Email" error={form.formState.errors.email?.message}><input className={controlClass} {...form.register("email")} /></Field>
          <Field label="Phone" error={form.formState.errors.phone?.message}><input className={controlClass} {...form.register("phone")} /></Field>
          <Field label="GSTIN" error={form.formState.errors.gstin?.message}><input className={controlClass} {...form.register("gstin")} /></Field>
          <div className="sm:col-span-2">
            <Field label="Address" error={form.formState.errors.address?.message}><textarea className={textareaClass} {...form.register("address")} /></Field>
          </div>
        </div>
      </section>
      <section className="rounded-xl border border-line bg-white p-5">
        <h2 className="text-[14px] font-semibold text-ink">Currency and tax</h2>
        <p className="mt-1 text-[12px] text-slate-500">Changing currency updates how amounts are displayed. It does not convert existing values.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Currency">
            <select className={controlClass} {...form.register("currency")}>
              {CURRENCIES.map((currency) => <option key={currency.code} value={currency.code}>{currency.label}</option>)}
            </select>
          </Field>
          <Field label="Default tax %" error={form.formState.errors.taxPercent?.message}>
            <input type="number" min={0} max={100} step="0.01" className={controlClass} {...form.register("taxPercent", { valueAsNumber: true })} />
          </Field>
        </div>
      </section>
      <section className="rounded-xl border border-line bg-white p-5">
        <h2 className="text-[14px] font-semibold text-ink">Warehouses</h2>
        <ul className="mt-3 divide-y divide-[#f1f2f4]">
          {list.map((warehouse, index) => (
            <li key={`${warehouse}-${index}`} className="flex items-center justify-between py-2 text-[13px]">
              <span>{warehouse}</span>
              <button type="button" className="text-[12px] text-rose-700" onClick={() => form.setValue("warehouses", list.filter((_, itemIndex) => itemIndex !== index), { shouldValidate: true })}>Remove</button>
            </li>
          ))}
        </ul>
        {form.formState.errors.warehouses?.message ? <p className="mt-2 text-[12px] text-rose-600">{form.formState.errors.warehouses.message}</p> : null}
        <div className="mt-3 flex gap-2">
          <input className={controlClass} value={warehouseName} onChange={(event) => setWarehouseName(event.target.value)} placeholder="New warehouse" />
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              const name = warehouseName.trim();
              if (name.length < 2 || list.some((item) => item.toLowerCase() === name.toLowerCase())) return;
              form.setValue("warehouses", [...list, name], { shouldValidate: true });
              setWarehouseName("");
            }}
          >
            Add
          </Button>
        </div>
      </section>
      <section className="rounded-xl border border-line bg-white p-5">
        <h2 className="text-[14px] font-semibold text-ink">Notifications</h2>
        <div className="mt-3 space-y-2 text-[13px]">
          <label className="flex items-center gap-2"><input type="checkbox" {...form.register("notifications.lowStock")} /> Low stock alerts</label>
          <label className="flex items-center gap-2"><input type="checkbox" {...form.register("notifications.orders")} /> Recent sales in the notification menu</label>
          <label className="flex items-center gap-2"><input type="checkbox" {...form.register("notifications.purchases")} /> Pending purchases in the notification menu</label>
        </div>
      </section>
      <div className="flex justify-end">
        <Button type="submit">Save settings</Button>
      </div>
    </form>
  );
}
