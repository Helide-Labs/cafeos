import { TEAM_ROLES } from "@/lib/defaults";
import type { ModuleId } from "@/lib/types";

export type AppRole = (typeof TEAM_ROLES)[number];

export type DashboardWidget =
  | "sales"
  | "orderCount"
  | "lowStock"
  | "customers"
  | "chart"
  | "alerts"
  | "liveOrders"
  | "activity"
  | "ticketQueue"
  | "teamOnShift";

type RoleProfile = {
  summary: string;
  modules: ModuleId[];
  canRefund: boolean;
  showMoney: boolean;
  campaigns: boolean;
  inventory: "full" | "floor" | "none";
  widgets: DashboardWidget[];
  primaryAction: { label: string; module: ModuleId };
};

export const ROLE_PROFILES: Record<AppRole, RoleProfile> = {
  Owner: {
    summary: "Full café view: sales, stock, team, and settings.",
    modules: ["overview", "pos", "orders", "menu", "inventory", "customers", "team", "reports", "settings"],
    canRefund: true,
    showMoney: true,
    campaigns: true,
    inventory: "full",
    widgets: ["sales", "orderCount", "lowStock", "customers", "chart", "alerts", "liveOrders", "activity", "teamOnShift"],
    primaryAction: { label: "New order", module: "pos" },
  },
  Manager: {
    summary: "Run the floor: menu, stock, team, and today's numbers.",
    modules: ["overview", "pos", "orders", "menu", "inventory", "customers", "team", "reports"],
    canRefund: true,
    showMoney: true,
    campaigns: true,
    inventory: "full",
    widgets: ["sales", "orderCount", "lowStock", "customers", "chart", "alerts", "liveOrders", "activity", "teamOnShift"],
    primaryAction: { label: "New order", module: "pos" },
  },
  Cashier: {
    summary: "Take orders, payments, and look up guests.",
    modules: ["overview", "pos", "orders", "customers"],
    canRefund: true,
    showMoney: true,
    campaigns: false,
    inventory: "none",
    widgets: ["orderCount", "customers", "liveOrders", "activity"],
    primaryAction: { label: "New order", module: "pos" },
  },
  Barista: {
    summary: "Make drinks and watch ingredient levels.",
    modules: ["overview", "orders", "inventory"],
    canRefund: false,
    showMoney: false,
    campaigns: false,
    inventory: "floor",
    widgets: ["ticketQueue", "lowStock", "alerts"],
    primaryAction: { label: "Open queue", module: "orders" },
  },
  Kitchen: {
    summary: "Prepare tickets and flag stock that is running out.",
    modules: ["overview", "orders", "inventory"],
    canRefund: false,
    showMoney: false,
    campaigns: false,
    inventory: "floor",
    widgets: ["ticketQueue", "lowStock", "alerts"],
    primaryAction: { label: "Open queue", module: "orders" },
  },
};

export const ROLE_AREAS: { area: string; allow: (role: AppRole) => boolean }[] = [
  { area: "Point of sale", allow: (role) => canAccess(role, "pos") },
  { area: "Orders & KDS", allow: (role) => canAccess(role, "orders") },
  { area: "Menu & pricing", allow: (role) => canAccess(role, "menu") },
  { area: "Inventory levels", allow: (role) => canAccess(role, "inventory") },
  { area: "Purchasing", allow: (role) => ROLE_PROFILES[role].inventory === "full" },
  { area: "Customers & loyalty", allow: (role) => canAccess(role, "customers") },
  { area: "Campaigns", allow: (role) => ROLE_PROFILES[role].campaigns },
  { area: "Team & schedule", allow: (role) => canAccess(role, "team") },
  { area: "Reports", allow: (role) => canAccess(role, "reports") },
  { area: "Settings", allow: (role) => canAccess(role, "settings") },
  { area: "Refunds", allow: (role) => ROLE_PROFILES[role].canRefund },
];

const ROLE_STORAGE_KEY = "caflix-active-role";

export function canAccess(role: AppRole, module: ModuleId) {
  return ROLE_PROFILES[role].modules.includes(module);
}

export function readStoredRole(): AppRole {
  if (typeof window === "undefined") return "Owner";
  const value = window.localStorage.getItem(ROLE_STORAGE_KEY);
  return TEAM_ROLES.includes(value as AppRole) ? (value as AppRole) : "Owner";
}

export function storeRole(role: AppRole) {
  window.localStorage.setItem(ROLE_STORAGE_KEY, role);
}
