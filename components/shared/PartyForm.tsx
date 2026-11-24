"use client";

import { Button } from "@/components/shared/Button";
import { controlClass, Field, textareaClass } from "@/components/shared/FormField";
import { partySchema, type PartyFormValues } from "@/lib/validations";
import type { Party } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

export function PartyForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: Party | null;
  submitLabel: string;
  onSubmit: (values: PartyFormValues) => void;
  onCancel: () => void;
}) {
  const form = useForm<PartyFormValues>({
    resolver: zodResolver(partySchema),
    defaultValues: {
      name: initial?.name ?? "",
      company: initial?.company ?? "",
      email: initial?.email ?? "",
      phone: initial?.phone ?? "",
      address: initial?.address ?? "",
    },
  });

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <Field label="Name" error={form.formState.errors.name?.message}>
        <input className={controlClass} {...form.register("name")} />
      </Field>
      <Field label="Company" error={form.formState.errors.company?.message}>
        <input className={controlClass} {...form.register("company")} />
      </Field>
      <Field label="Email" error={form.formState.errors.email?.message}>
        <input type="email" className={controlClass} {...form.register("email")} />
      </Field>
      <Field label="Phone" error={form.formState.errors.phone?.message}>
        <input className={controlClass} {...form.register("phone")} />
      </Field>
      <Field label="Address" error={form.formState.errors.address?.message}>
        <textarea className={textareaClass} {...form.register("address")} />
      </Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
