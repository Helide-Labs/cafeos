import { NextResponse } from "next/server";
import { ensureTenantBranch, getAccount } from "@/lib/data/repo";
import { ROLE_PROFILES, type AppRole } from "@/lib/roles";
import { accountIdFromSession, sessionToken } from "@/lib/session";
import { TEAM_ROLES } from "@/lib/defaults";
import type { AppState, ModuleId, StaffAccount } from "@/lib/types";

export type AuthedAccount = StaffAccount & { role: AppRole };

function normalizeRole(role: string): AppRole {
  return TEAM_ROLES.includes(role as AppRole) ? (role as AppRole) : "Cashier";
}

export async function currentAccount(request: Request): Promise<AuthedAccount | null> {
  await ensureTenantBranch();
  const accountId = accountIdFromSession(sessionToken(request));
  if (!accountId) return null;
  const account = await getAccount(accountId);
  if (!account) return null;
  return {
    id: account.id,
    name: account.name,
    username: account.username,
    role: normalizeRole(account.role),
  };
}

type AuthOk = { account: AuthedAccount; error: null };
type AuthFail = { account: null; error: NextResponse };
type AuthResult = AuthOk | AuthFail;

export async function requireAuth(request: Request): Promise<AuthResult> {
  const account = await currentAccount(request);
  if (!account) {
    return { account: null, error: NextResponse.json({ error: "Sign in required" }, { status: 401 }) };
  }
  return { account, error: null };
}

export async function requireOwner(request: Request): Promise<AuthResult> {
  const { account, error } = await requireAuth(request);
  if (error) return { account: null, error };
  if (account.role !== "Owner") {
    return { account: null, error: NextResponse.json({ error: "Only the main account can do that" }, { status: 403 }) };
  }
  return { account, error: null };
}

export async function requireAccess(
  request: Request,
  check: (role: AppRole) => boolean,
  message = "You do not have access",
): Promise<AuthResult> {
  const { account, error } = await requireAuth(request);
  if (error) return { account: null, error };
  if (!check(account.role)) {
    return { account: null, error: NextResponse.json({ error: message }, { status: 403 }) };
  }
  return { account, error: null };
}

export function canUseModule(role: AppRole, module: ModuleId) {
  return ROLE_PROFILES[role].modules.includes(module);
}

export function filterBootstrapForRole(data: AppState, role: AppRole): AppState {
  const profile = ROLE_PROFILES[role];
  const next: AppState = { ...data };

  if (!profile.showMoney) {
    next.orders = data.orders.map((order) => ({
      ...order,
      total: 0,
      subtotal: 0,
      tax: 0,
      serviceCharge: 0,
      discount: 0,
      tip: 0,
      paymentMethod: "",
      amountTendered: undefined,
      changeDue: undefined,
      lines: order.lines.map((line) => ({ ...line, price: 0 })),
    }));
    next.customers = data.customers.map((customer) => ({ ...customer, spent: 0 }));
  }

  if (profile.inventory === "floor") {
    next.purchaseOrders = [];
    next.stock = data.stock.map((item) => ({ ...item, value: 0, supplier: "", trend: 0 }));
  }

  if (profile.inventory === "none") {
    next.stock = [];
    next.purchaseOrders = [];
    next.ledger = [];
    next.waste = [];
  }

  if (!profile.campaigns) next.campaigns = [];
  if (!canUseModule(role, "menu")) {
    next.recipes = [];
    if (!canUsePos(role)) {
      next.products = [];
      next.modifierGroups = [];
    }
  }
  if (!canUseModule(role, "team")) next.employees = [];
  if (!canUseModule(role, "customers")) {
    next.customers = [];
    next.feedback = [];
  }

  return next;
}

export function canRefund(role: AppRole) {
  return ROLE_PROFILES[role].canRefund;
}

export function canManageMenu(role: AppRole) {
  return canUseModule(role, "menu");
}

export function canUsePos(role: AppRole) {
  return canUseModule(role, "pos");
}

export function canUseOrders(role: AppRole) {
  return canUseModule(role, "orders");
}

export function canUseInventory(role: AppRole) {
  return canUseModule(role, "inventory");
}

export function canPurchase(role: AppRole) {
  return ROLE_PROFILES[role].inventory === "full";
}

export function canManageInventoryCatalog(role: AppRole) {
  return ROLE_PROFILES[role].inventory === "full";
}

export function canUseCustomers(role: AppRole) {
  return canUseModule(role, "customers");
}

export function canUseCampaigns(role: AppRole) {
  return ROLE_PROFILES[role].campaigns;
}

export function canUseTeam(role: AppRole) {
  return canUseModule(role, "team");
}

export function canUseSettings(role: AppRole) {
  return canUseModule(role, "settings");
}

export function canReadCatalog(role: AppRole) {
  return canUsePos(role) || canManageMenu(role);
}

export function cleanUsername(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

export function validCredentials(name: string, username: string, password: string) {
  if (name.trim().length < 2) return "Name is required";
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) return "Username must be 3–32 letters or numbers";
  if (password.length < 6) return "Password must be at least 6 characters";
  return "";
}
