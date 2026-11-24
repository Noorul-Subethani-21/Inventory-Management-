"use client";

import { ENTITY_ROUTES } from "@/components/layout/navigation";
import { ToastProvider } from "@/components/shared/Toast";
import { StoreProvider } from "@/lib/store";
import type { EntityKind } from "@/types";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Intent =
  | { type: "create"; entity: EntityKind; productId?: string }
  | { type: "open"; entity: EntityKind; id: string };

interface UiValue {
  intent: Intent | null;
  clearIntent: () => void;
  create: (entity: EntityKind, productId?: string) => void;
  open: (entity: EntityKind, id: string) => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
}

const UiContext = createContext<UiValue | null>(null);

export function UiProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [intent, setIntent] = useState<Intent | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  const value = useMemo<UiValue>(
    () => ({
      intent,
      clearIntent: () => setIntent(null),
      create: (entity, productId) => {
        setIntent({ type: "create", entity, productId });
        router.push(ENTITY_ROUTES[entity]);
      },
      open: (entity, id) => {
        setIntent({ type: "open", entity, id });
        router.push(ENTITY_ROUTES[entity]);
      },
      searchOpen,
      setSearchOpen,
    }),
    [intent, router, searchOpen],
  );

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}

export function useUi() {
  const value = useContext(UiContext);
  if (!value) throw new Error("useUi must be used within UiProvider");
  return value;
}

export function useIntentHandler(entity: EntityKind, handler: (intent: Intent) => void) {
  const { intent, clearIntent } = useUi();
  useEffect(() => {
    if (!intent || intent.entity !== entity) return;
    handler(intent);
    clearIntent();
  }, [intent, entity, clearIntent, handler]);
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      <ToastProvider>
        <UiProvider>{children}</UiProvider>
      </ToastProvider>
    </StoreProvider>
  );
}
