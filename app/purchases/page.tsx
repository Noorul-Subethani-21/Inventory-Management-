import type { Metadata } from "next";
import { PurchasesPage } from "@/components/purchases/PurchasesPage";

export const metadata: Metadata = { title: "Purchases" };

export default function Page() {
  return <PurchasesPage />;
}
