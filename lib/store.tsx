"use client";

import { buildSeed } from "@/lib/seed";
import {
  adjustStock,
  createCustomer,
  createProduct,
  createPurchase,
  createSale,
  createSupplier,
  deleteCustomer,
  deleteProduct,
  deletePurchase,
  deleteSale,
  deleteSupplier,
  updateCustomer,
  updateProduct,
  updatePurchase,
  updateSale,
  updateSettings,
  updateSupplier,
  type Result,
} from "@/lib/inventory";
import type { AdjustmentInput, AppState, PartyInput, ProductInput, ProductUpdate, PurchaseInput, SaleInput, Settings } from "@/types";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

const STORAGE_KEY = "inventoryos.v1";

type ActionResult = { ok: true } | { ok: false; error: string };

interface StoreValue {
  ready: boolean;
  state: AppState | null;
  createProduct: (input: ProductInput) => ActionResult;
  updateProduct: (id: string, input: ProductUpdate) => ActionResult;
  deleteProduct: (id: string) => ActionResult;
  adjustStock: (input: AdjustmentInput) => ActionResult;
  createCustomer: (input: PartyInput) => ActionResult;
  updateCustomer: (id: string, input: PartyInput) => ActionResult;
  deleteCustomer: (id: string) => ActionResult;
  createSupplier: (input: PartyInput) => ActionResult;
  updateSupplier: (id: string, input: PartyInput) => ActionResult;
  deleteSupplier: (id: string) => ActionResult;
  createSale: (input: SaleInput) => ActionResult;
  updateSale: (id: string, input: SaleInput) => ActionResult;
  deleteSale: (id: string) => ActionResult;
  createPurchase: (input: PurchaseInput) => ActionResult;
  updatePurchase: (id: string, input: PurchaseInput) => ActionResult;
  deletePurchase: (id: string) => ActionResult;
  updateSettings: (settings: Settings) => ActionResult;
  resetData: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

function readStorage(): AppState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { version?: number; state?: AppState };
    if (parsed.version !== 1 || !parsed.state?.products || !parsed.state.settings || !parsed.state.sales) return null;
    return parsed.state;
  } catch {
    return null;
  }
}

function commitResult(result: Result<AppState>, apply: (state: AppState) => void): ActionResult {
  if (!result.ok) return result;
  apply(result.data);
  return { ok: true };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState | null>(null);
  const stateRef = useRef<AppState | null>(null);

  useEffect(() => {
    const stored = readStorage();
    const next = stored ?? buildSeed();
    stateRef.current = next;
    // Workspace data is read from this browser after mount so dates stay current.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(next);
  }, []);

  useEffect(() => {
    if (!state) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, state }));
    } catch {
      /* Ignore quota and private-mode failures. The session still works. */
    }
  }, [state]);

  const api = useMemo<StoreValue>(() => {
    const apply = (next: AppState) => {
      stateRef.current = next;
      setState(next);
    };
    const current = () => stateRef.current;

    const run = (produce: (snapshot: AppState) => Result<AppState>): ActionResult => {
      const snapshot = current();
      if (!snapshot) return { ok: false, error: "Workspace is still loading." };
      return commitResult(produce(snapshot), apply);
    };

    return {
      ready: state !== null,
      state,
      createProduct: (input) => run((snapshot) => createProduct(snapshot, input)),
      updateProduct: (id, input) => run((snapshot) => updateProduct(snapshot, id, input)),
      deleteProduct: (id) => run((snapshot) => deleteProduct(snapshot, id)),
      adjustStock: (input) => run((snapshot) => adjustStock(snapshot, input)),
      createCustomer: (input) => run((snapshot) => createCustomer(snapshot, input)),
      updateCustomer: (id, input) => run((snapshot) => updateCustomer(snapshot, id, input)),
      deleteCustomer: (id) => run((snapshot) => deleteCustomer(snapshot, id)),
      createSupplier: (input) => run((snapshot) => createSupplier(snapshot, input)),
      updateSupplier: (id, input) => run((snapshot) => updateSupplier(snapshot, id, input)),
      deleteSupplier: (id) => run((snapshot) => deleteSupplier(snapshot, id)),
      createSale: (input) => run((snapshot) => createSale(snapshot, input)),
      updateSale: (id, input) => run((snapshot) => updateSale(snapshot, id, input)),
      deleteSale: (id) => run((snapshot) => deleteSale(snapshot, id)),
      createPurchase: (input) => run((snapshot) => createPurchase(snapshot, input)),
      updatePurchase: (id, input) => run((snapshot) => updatePurchase(snapshot, id, input)),
      deletePurchase: (id) => run((snapshot) => deletePurchase(snapshot, id)),
      updateSettings: (settings) => run((snapshot) => updateSettings(snapshot, settings)),
      resetData: () => apply(buildSeed()),
    };
  }, [state]);

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useStore must be used within StoreProvider");
  return value;
}
