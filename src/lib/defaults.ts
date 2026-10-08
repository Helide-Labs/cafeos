import type { CafeSettings } from "@/lib/types";

export const DEFAULT_CATEGORIES = [
  "Coffee",
  "Tea",
  "Cold drinks",
  "Bakery",
  "Food",
  "Desserts",
  "Merchandise",
  "Other",
];

export const DEFAULT_SETTINGS: CafeSettings = {
  currency: "LKR",
  timezone: "Asia/Colombo",
  taxRate: 0.025,
  serviceChargeRate: 0,
  categories: [...DEFAULT_CATEGORIES],
  notifyLowStock: true,
  notifyRefunds: true,
  notifyLate: true,
  notifyDaily: true,
  integrationWhatsapp: false,
  integrationStripe: false,
  integrationPickme: false,
  integrationXero: false,
  tipPresets: [0, 50, 100, 200],
};

export const TEAM_ROLES = ["Owner", "Manager", "Cashier", "Barista", "Kitchen"] as const;

export const STOCK_CATEGORIES = ["Coffee", "Dairy", "Bakery", "Packaging", "Produce", "Other"] as const;

export const STOCK_UNITS = ["g", "kg", "ml", "L", "pcs", "bags"] as const;
