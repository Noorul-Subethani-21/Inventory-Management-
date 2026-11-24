import type { Metadata } from "next";
import { SalesPage } from "@/components/sales/SalesPage";

export const metadata: Metadata = { title: "Sales" };

export default function Page() {
  return <SalesPage />;
}
