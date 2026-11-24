import type { Metadata } from "next";
import { SuppliersPage } from "@/components/suppliers/SuppliersPage";

export const metadata: Metadata = { title: "Suppliers" };

export default function Page() {
  return <SuppliersPage />;
}
