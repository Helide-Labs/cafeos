import type { CafeSettings, CartItem } from "@/lib/types";

export type MoneyBreakdown = {
  subtotal: number;
  tax: number;
  serviceCharge: number;
  discount: number;
  tip: number;
  total: number;
};

export function cartSubtotal(cart: CartItem[]) {
  return Math.round(cart.reduce((sum, item) => sum + item.price * item.quantity, 0));
}

export function computeOrderMoney(
  cart: CartItem[],
  settings: Pick<CafeSettings, "taxRate" | "serviceChargeRate">,
  input?: { discount?: number; tip?: number },
): MoneyBreakdown {
  const subtotal = cartSubtotal(cart);
  const tax = Math.round(subtotal * (settings.taxRate || 0));
  const serviceCharge = Math.round(subtotal * (settings.serviceChargeRate || 0));
  const discount = Math.max(0, Math.round(input?.discount ?? 0));
  const tip = Math.max(0, Math.round(input?.tip ?? 0));
  const total = Math.max(0, subtotal + tax + serviceCharge + tip - discount);
  return { subtotal, tax, serviceCharge, discount, tip, total };
}

/** Stock `value` is unit cost. Inventory valuation = qty × unit cost. */
export function stockUnitCost(item: { value: number }) {
  return Math.max(0, item.value || 0);
}

export function stockInventoryValue(item: { quantity: number; value: number }) {
  return Math.round(stockUnitCost(item) * item.quantity);
}

export function recipeLineCost(unitCost: number, quantity: number) {
  return Math.round(unitCost * quantity);
}
