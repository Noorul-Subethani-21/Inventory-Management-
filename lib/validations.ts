import { z } from "zod";

const money = (label: string) =>
  z.number({ invalid_type_error: `Enter a valid ${label}` }).positive(`${label} must be greater than zero`);

const quantity = z
  .number({ invalid_type_error: "Enter a quantity" })
  .int("Use a whole number")
  .positive("Quantity must be at least 1");

export const lineSchema = z.object({
  productId: z.string().min(1, "Select a product"),
  quantity,
  unitPrice: money("price"),
});

export const saleSchema = z
  .object({
    customerId: z.string().min(1, "Select a customer"),
    date: z.string().min(1, "Choose a date"),
    discount: z.number({ invalid_type_error: "Enter a discount" }).min(0, "Discount cannot be negative"),
    taxPercent: z.number({ invalid_type_error: "Enter a tax rate" }).min(0, "Tax cannot be negative").max(100, "Tax cannot exceed 100%"),
    paymentStatus: z.enum(["paid", "partial", "unpaid"]),
    orderStatus: z.enum(["draft", "pending", "confirmed", "cancelled"]),
    items: z.array(lineSchema).min(1, "Add at least one product"),
  })
  .superRefine((value, ctx) => {
    const subtotal = value.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    if (value.discount > subtotal) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["discount"], message: "Discount cannot exceed the subtotal" });
    }
  });

export const purchaseSchema = z
  .object({
    supplierId: z.string().min(1, "Select a supplier"),
    orderDate: z.string().min(1, "Choose an order date"),
    expectedDelivery: z.string().min(1, "Choose an expected delivery date"),
    taxPercent: z.number({ invalid_type_error: "Enter a tax rate" }).min(0).max(100, "Tax cannot exceed 100%"),
    paymentStatus: z.enum(["paid", "partial", "unpaid"]),
    receivingStatus: z.enum(["pending", "partial", "received", "cancelled"]),
    items: z.array(lineSchema).min(1, "Add at least one product"),
  })
  .superRefine((value, ctx) => {
    if (value.expectedDelivery < value.orderDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expectedDelivery"],
        message: "Expected delivery cannot be before the order date",
      });
    }
  });

const imageUrl = z
  .string()
  .trim()
  .refine((value) => value === "" || /^https?:\/\/\S+$/i.test(value), "Enter a valid image URL starting with http");

export const productCreateSchema = z.object({
  name: z.string().trim().min(2, "Enter a product name"),
  sku: z.string().trim().min(2, "Enter a SKU"),
  category: z.string().trim().min(2, "Enter a category"),
  description: z.string().trim().max(400, "Keep the description under 400 characters"),
  unitPrice: money("selling price"),
  costPrice: z.number({ invalid_type_error: "Enter a cost price" }).min(0, "Cost cannot be negative"),
  quantity: z.number({ invalid_type_error: "Enter a quantity" }).int("Use a whole number").min(0, "Quantity cannot be negative"),
  minStock: z.number({ invalid_type_error: "Enter a minimum level" }).int("Use a whole number").min(0, "Minimum stock cannot be negative"),
  warehouse: z.string().min(1, "Select a warehouse"),
  imageUrl,
});

export const productEditSchema = productCreateSchema.omit({ quantity: true });

export const partySchema = z.object({
  name: z.string().trim().min(2, "Enter a name"),
  company: z.string().trim().min(2, "Enter a company"),
  email: z.string().trim().email("Enter a valid email"),
  phone: z.string().trim().min(8, "Enter a phone number"),
  address: z.string().trim().min(6, "Enter an address"),
});

export const adjustmentSchema = z.object({
  delta: z
    .number({ invalid_type_error: "Enter a quantity" })
    .int("Use a whole number")
    .refine((value) => value !== 0, "Enter a quantity to add or remove"),
  note: z.string().trim().min(3, "Add a short reason"),
});

export const settingsSchema = z.object({
  businessName: z.string().trim().min(2, "Enter the business name"),
  email: z.string().trim().email("Enter a valid email"),
  phone: z.string().trim().min(8, "Enter a phone number"),
  address: z.string().trim().min(6, "Enter an address"),
  gstin: z.string().trim().min(8, "Enter a GSTIN"),
  currency: z.enum(["INR", "USD", "EUR"]),
  taxPercent: z.number({ invalid_type_error: "Enter a tax rate" }).min(0).max(100),
  warehouses: z.array(z.string().trim().min(2)).min(1, "Keep at least one warehouse"),
  notifications: z.object({
    lowStock: z.boolean(),
    orders: z.boolean(),
    purchases: z.boolean(),
  }),
});

export type SaleFormValues = z.infer<typeof saleSchema>;
export type PurchaseFormValues = z.infer<typeof purchaseSchema>;
export type ProductCreateValues = z.infer<typeof productCreateSchema>;
export type ProductEditValues = z.infer<typeof productEditSchema>;
export type PartyFormValues = z.infer<typeof partySchema>;
export type AdjustmentFormValues = z.infer<typeof adjustmentSchema>;
export type SettingsFormValues = z.infer<typeof settingsSchema>;
