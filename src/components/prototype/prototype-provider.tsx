"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { demoState } from "@/lib/demo-data";
import type { Activity, CartItem, Order, OrderStatus, PrototypeState } from "@/lib/types";

type PrototypeContextValue = PrototypeState & {
  hydrated: boolean;
  createOrder: (cart: CartItem[], type: Order["type"], customer?: string) => Order;
  advanceOrder: (id: string) => void;
  toggleProduct: (id: string) => void;
  adjustStock: (id: string, amount: number) => void;
  addActivity: (activity: Omit<Activity, "id" | "time">) => void;
  resetDemo: () => void;
};

const PrototypeContext = createContext<PrototypeContextValue | null>(null);
const STORAGE_KEY = "cafeos-prototype-v1";
const orderFlow: OrderStatus[] = ["Received", "Preparing", "Ready", "Completed"];

export function PrototypeProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PrototypeState>(demoState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let restored: PrototypeState | null = null;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) restored = JSON.parse(saved) as PrototypeState;
    } catch {
      // Corrupt demo data should never block the prototype.
    }
    const timer = window.setTimeout(() => {
      if (restored) setState(restored);
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [hydrated, state]);

  const value = useMemo<PrototypeContextValue>(() => ({
    ...state,
    hydrated,
    createOrder(cart, type, customer = "Walk-in") {
      const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const nextNumber = Math.max(...state.orders.map((order) => Number(order.number.slice(1)))) + 1;
      const order: Order = {
        id: `o${nextNumber}`,
        number: `#${nextNumber}`,
        customer,
        type,
        status: "Received",
        total,
        items: cart.reduce((sum, item) => sum + item.quantity, 0),
        placedAt: "Just now",
      };
      setState((current) => ({
        ...current,
        orders: [order, ...current.orders],
        activities: [{
          id: `a-${Date.now()}`,
          title: `Order ${order.number} received`,
          detail: `${type} · LKR ${total.toLocaleString()}`,
          time: "now",
          tone: "green",
        }, ...current.activities],
      }));
      return order;
    },
    advanceOrder(id) {
      setState((current) => ({
        ...current,
        orders: current.orders.map((order) => {
          if (order.id !== id) return order;
          const index = orderFlow.indexOf(order.status);
          return { ...order, status: orderFlow[Math.min(index + 1, orderFlow.length - 1)] };
        }),
      }));
    },
    toggleProduct(id) {
      setState((current) => ({
        ...current,
        products: current.products.map((product) => product.id === id ? { ...product, available: !product.available } : product),
      }));
    },
    adjustStock(id, amount) {
      setState((current) => ({
        ...current,
        stock: current.stock.map((item) => item.id === id ? { ...item, quantity: Math.max(0, Math.round((item.quantity + amount) * 10) / 10) } : item),
      }));
    },
    addActivity(activity) {
      setState((current) => ({
        ...current,
        activities: [{ ...activity, id: `a-${Date.now()}`, time: "now" }, ...current.activities],
      }));
    },
    resetDemo() {
      setState(demoState);
      window.localStorage.removeItem(STORAGE_KEY);
    },
  }), [hydrated, state]);

  return <PrototypeContext.Provider value={value}>{children}</PrototypeContext.Provider>;
}

export function usePrototype() {
  const value = useContext(PrototypeContext);
  if (!value) throw new Error("usePrototype must be used inside PrototypeProvider");
  return value;
}
