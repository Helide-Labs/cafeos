"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_SETTINGS } from "@/lib/defaults";
import type {
  Activity,
  AppState,
  CafeSettings,
  Campaign,
  CartItem,
  Customer,
  Employee,
  Feedback,
  ModifierGroup,
  Order,
  Product,
  PurchaseOrder,
  Recipe,
  StockItem,
} from "@/lib/types";

type CreateOrderInput = {
  cart: CartItem[];
  type: Order["type"];
  customer?: string;
  customerId?: string;
  subtotal?: number;
  tax?: number;
  serviceCharge?: number;
  discount?: number;
  tip?: number;
  paymentMethod?: string;
  amountTendered?: number;
  changeDue?: number;
  pointsRedeemed?: number;
};

type AppContextValue = AppState & {
  hydrated: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createOrder: (input: CreateOrderInput) => Promise<Order>;
  advanceOrder: (id: string) => Promise<void>;
  refundOrder: (id: string) => Promise<void>;
  toggleProduct: (id: string) => Promise<void>;
  createProduct: (input: Parameters<typeof createProductRequest>[0]) => Promise<void>;
  updateProduct: (id: string, patch: Record<string, unknown>) => Promise<void>;
  removeProduct: (id: string) => Promise<void>;
  createStockItem: (input: Record<string, unknown>) => Promise<void>;
  updateStockItem: (id: string, patch: Record<string, unknown>) => Promise<void>;
  removeStockItem: (id: string) => Promise<void>;
  adjustStock: (id: string, amount?: number, quantity?: number, note?: string) => Promise<void>;
  recordWaste: (input: { stockId: string; quantity: number; reason: string }) => Promise<void>;
  createPurchaseOrder: (input: Record<string, unknown>) => Promise<void>;
  updatePurchaseOrder: (id: string, patch: Record<string, unknown>) => Promise<void>;
  createCustomer: (input: Record<string, unknown>) => Promise<Customer>;
  updateCustomer: (id: string, patch: Record<string, unknown>) => Promise<void>;
  removeCustomer: (id: string) => Promise<void>;
  createEmployee: (input: Record<string, unknown>) => Promise<void>;
  updateEmployee: (id: string, patch: Record<string, unknown>) => Promise<void>;
  removeEmployee: (id: string) => Promise<void>;
  saveSettings: (patch: Partial<CafeSettings> & { tenantName?: string; branchName?: string; location?: string }) => Promise<void>;
  saveRecipe: (recipe: Recipe) => Promise<void>;
  removeRecipe: (productId: string) => Promise<void>;
  createModifierGroup: (input: Omit<ModifierGroup, "id">) => Promise<void>;
  updateModifierGroup: (id: string, patch: Partial<Omit<ModifierGroup, "id">>) => Promise<void>;
  removeModifierGroup: (id: string) => Promise<void>;
  createFeedback: (input: { customerName: string; rating: number; comment?: string }) => Promise<void>;
  createCampaign: (input: { title: string; audience: string; offer: string; status?: Campaign["status"] }) => Promise<void>;
  updateCampaign: (id: string, patch: Partial<Campaign>) => Promise<void>;
  deleteCampaign: (id: string) => Promise<void>;
  addActivity: (activity: Omit<Activity, "id" | "time">) => Promise<void>;
};

async function createProductRequest(input: {
  name: string;
  category: string;
  price: number;
  cost?: number;
  emoji?: string;
  imageUrl?: string;
  description?: string;
  available?: boolean;
  popular?: boolean;
  modifierGroupIds?: string[];
}) {
  return input;
}

const emptyState: AppState = {
  tenant: { id: "", name: "My Café" },
  branch: { id: "", name: "Main branch", location: "Add your location" },
  products: [],
  orders: [],
  stock: [],
  customers: [],
  employees: [],
  activities: [],
  settings: { ...DEFAULT_SETTINGS, categories: [...DEFAULT_SETTINGS.categories] },
  recipes: [],
  modifierGroups: [],
  ledger: [],
  waste: [],
  purchaseOrders: [],
  feedback: [],
  campaigns: [],
};

const AppContext = createContext<AppContextValue | null>(null);

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error((payload as { error?: string }).error || `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  return readJson<T>(
    await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    }),
  );
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(emptyState);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const data = await api<AppState>("/api/bootstrap");
    setState(data);
    setError(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refresh();
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const value = useMemo<AppContextValue>(
    () => ({
      ...state,
      hydrated,
      error,
      refresh,
      async createOrder(input) {
        const order = await api<Order>("/api/orders", {
          method: "POST",
          body: JSON.stringify(input),
        });
        await refresh();
        return order;
      },
      async advanceOrder(id) {
        await api(`/api/orders/${id}`, { method: "PATCH", body: JSON.stringify({ advance: true }) });
        await refresh();
      },
      async refundOrder(id) {
        await api(`/api/orders/${id}`, { method: "PATCH", body: JSON.stringify({ refund: true }) });
        await refresh();
      },
      async toggleProduct(id) {
        await api(`/api/products/${id}`, { method: "PATCH", body: JSON.stringify({ toggleAvailable: true }) });
        await refresh();
      },
      async createProduct(input) {
        await api("/api/products", { method: "POST", body: JSON.stringify(input) });
        await refresh();
      },
      async updateProduct(id, patch) {
        await api(`/api/products/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
        await refresh();
      },
      async removeProduct(id) {
        await api(`/api/products/${id}`, { method: "DELETE" });
        await refresh();
      },
      async createStockItem(input) {
        await api("/api/stock", { method: "POST", body: JSON.stringify(input) });
        await refresh();
      },
      async updateStockItem(id, patch) {
        await api(`/api/stock/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
        await refresh();
      },
      async removeStockItem(id) {
        await api(`/api/stock/${id}`, { method: "DELETE" });
        await refresh();
      },
      async adjustStock(id, amount, quantity, note) {
        await api(`/api/stock/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ amount, quantity, note }),
        });
        await refresh();
      },
      async recordWaste(input) {
        await api("/api/waste", { method: "POST", body: JSON.stringify(input) });
        await refresh();
      },
      async createPurchaseOrder(input) {
        await api("/api/purchase-orders", { method: "POST", body: JSON.stringify(input) });
        await refresh();
      },
      async updatePurchaseOrder(id, patch) {
        await api(`/api/purchase-orders/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
        await refresh();
      },
      async createCustomer(input) {
        const customer = await api<Customer>("/api/customers", { method: "POST", body: JSON.stringify(input) });
        await refresh();
        return customer;
      },
      async updateCustomer(id, patch) {
        await api(`/api/customers/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
        await refresh();
      },
      async removeCustomer(id) {
        await api(`/api/customers/${id}`, { method: "DELETE" });
        await refresh();
      },
      async createEmployee(input) {
        await api("/api/employees", { method: "POST", body: JSON.stringify(input) });
        await refresh();
      },
      async updateEmployee(id, patch) {
        await api(`/api/employees/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
        await refresh();
      },
      async removeEmployee(id) {
        await api(`/api/employees/${id}`, { method: "DELETE" });
        await refresh();
      },
      async saveSettings(patch) {
        await api("/api/settings", { method: "PATCH", body: JSON.stringify(patch) });
        await refresh();
      },
      async saveRecipe(recipe) {
        await api("/api/recipes", { method: "PUT", body: JSON.stringify(recipe) });
        await refresh();
      },
      async removeRecipe(productId) {
        await api(`/api/recipes?productId=${encodeURIComponent(productId)}`, { method: "DELETE" });
        await refresh();
      },
      async createModifierGroup(input) {
        await api("/api/modifiers", { method: "POST", body: JSON.stringify(input) });
        await refresh();
      },
      async updateModifierGroup(id, patch) {
        await api(`/api/modifiers/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
        await refresh();
      },
      async removeModifierGroup(id) {
        await api(`/api/modifiers/${id}`, { method: "DELETE" });
        await refresh();
      },
      async createFeedback(input) {
        await api("/api/feedback", { method: "POST", body: JSON.stringify(input) });
        await refresh();
      },
      async createCampaign(input) {
        await api("/api/campaigns", { method: "POST", body: JSON.stringify(input) });
        await refresh();
      },
      async updateCampaign(id, patch) {
        await api(`/api/campaigns/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
        await refresh();
      },
      async deleteCampaign(id) {
        await api(`/api/campaigns/${id}`, { method: "DELETE" });
        await refresh();
      },
      async addActivity(activity) {
        await api("/api/activities", { method: "POST", body: JSON.stringify(activity) });
        await refresh();
      },
    }),
    [error, hydrated, refresh, state],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error("useApp must be used inside AppProvider");
  return value;
}

export type { Product, StockItem, Employee, Feedback, PurchaseOrder };
