import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { DEFAULT_SETTINGS } from "@/lib/defaults";
import type {
  ActivityDoc,
  BranchDoc,
  CampaignDoc,
  CountersDoc,
  CustomerDoc,
  EmployeeDoc,
  FeedbackDoc,
  LedgerDoc,
  ModifierGroupDoc,
  OrderDoc,
  ProductDoc,
  PurchaseOrderDoc,
  RecipeDoc,
  SettingsDoc,
  StockDoc,
  TenantDoc,
  WasteDoc,
} from "@/lib/firestore/types";

export type BranchData = {
  branch: BranchDoc;
  products: Record<string, ProductDoc>;
  orders: Record<string, OrderDoc>;
  stock: Record<string, StockDoc>;
  customers: Record<string, CustomerDoc>;
  employees: Record<string, EmployeeDoc>;
  activities: Record<string, ActivityDoc>;
  recipes: Record<string, RecipeDoc>;
  modifiers: Record<string, ModifierGroupDoc>;
  ledger: Record<string, LedgerDoc>;
  waste: Record<string, WasteDoc>;
  purchaseOrders: Record<string, PurchaseOrderDoc>;
  feedback: Record<string, FeedbackDoc>;
  campaigns: Record<string, CampaignDoc>;
  settings: SettingsDoc | null;
  counters: CountersDoc;
};

type MemoryDb = {
  tenants: Record<string, TenantDoc>;
  branches: Record<string, Record<string, BranchData>>;
};

const DATA_PATH = join(process.cwd(), ".data", "cafeos-memory.json");

function emptyBranch(branch: BranchDoc): BranchData {
  return {
    branch,
    products: {},
    orders: {},
    stock: {},
    customers: {},
    employees: {},
    activities: {},
    recipes: {},
    modifiers: {},
    ledger: {},
    waste: {},
    purchaseOrders: {},
    feedback: {},
    campaigns: {},
    settings: {
      ...DEFAULT_SETTINGS,
      categories: [...DEFAULT_SETTINGS.categories],
      updatedAt: new Date().toISOString(),
    },
    counters: { orderNumber: 1000 },
  };
}

function normalizeBranch(raw: Partial<BranchData> & { branch: BranchDoc }): BranchData {
  const base = emptyBranch(raw.branch);
  return {
    ...base,
    ...raw,
    products: raw.products ?? {},
    orders: raw.orders ?? {},
    stock: raw.stock ?? {},
    customers: raw.customers ?? {},
    employees: raw.employees ?? {},
    activities: raw.activities ?? {},
    recipes: raw.recipes ?? {},
    modifiers: raw.modifiers ?? {},
    ledger: raw.ledger ?? {},
    waste: raw.waste ?? {},
    purchaseOrders: raw.purchaseOrders ?? {},
    feedback: raw.feedback ?? {},
    campaigns: raw.campaigns ?? {},
    settings: raw.settings ?? base.settings,
    counters: raw.counters ?? base.counters,
  };
}

function load(): MemoryDb {
  if (!existsSync(DATA_PATH)) {
    return { tenants: {}, branches: {} };
  }
  return JSON.parse(readFileSync(DATA_PATH, "utf8")) as MemoryDb;
}

function save(db: MemoryDb) {
  mkdirSync(dirname(DATA_PATH), { recursive: true });
  writeFileSync(DATA_PATH, JSON.stringify(db, null, 2), "utf8");
}

export function withMemoryDb<T>(fn: (db: MemoryDb) => T): T {
  const db = load();
  const result = fn(db);
  save(db);
  return result;
}

export async function withMemoryDbAsync<T>(fn: (db: MemoryDb) => Promise<T> | T): Promise<T> {
  const db = load();
  const result = await fn(db);
  save(db);
  return result;
}

export function getBranchData(db: MemoryDb, tenantId: string, branchId: string): BranchData | null {
  const raw = db.branches[tenantId]?.[branchId];
  if (!raw) return null;
  const normalized = normalizeBranch(raw);
  db.branches[tenantId][branchId] = normalized;
  return normalized;
}

export function ensureBranchSlot(
  db: MemoryDb,
  tenantId: string,
  branchId: string,
  tenant: TenantDoc,
  branch: BranchDoc,
) {
  db.tenants[tenantId] = tenant;
  db.branches[tenantId] ??= {};
  db.branches[tenantId][branchId] ??= emptyBranch(branch);
  db.branches[tenantId][branchId] = normalizeBranch({
    ...db.branches[tenantId][branchId],
    branch,
  });
}

export function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
