import { DEFAULT_SETTINGS } from "@/lib/defaults";
import {
  inferSegment,
  initials,
  mapActivity,
  mapCampaign,
  mapCustomer,
  mapEmployee,
  mapFeedback,
  mapLedger,
  mapModifierGroup,
  mapOrder,
  mapProduct,
  mapPurchaseOrder,
  mapRecipe,
  mapSettings,
  mapStockItem,
  mapWaste,
  nextOrderStatus,
  nowIso,
  toDbActivityTone,
  toDbCampaignStatus,
  toDbEmployeeStatus,
  toDbOrderType,
  toDbPoStatus,
  toDbSegment,
} from "@/lib/firestore/mappers";
import type {
  ActivityDoc,
  BranchDoc,
  CampaignDoc,
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
  StockLedgerEntry,
  WasteRecord,
} from "@/lib/types";
import { computeOrderMoney } from "@/lib/money";
import { getDefaultBranchId, getDefaultTenantId } from "@/lib/tenant";
import {
  ensureBranchSlot,
  getBranchData,
  newId,
  withMemoryDb,
  type BranchData,
} from "@/lib/data/memory-store";

function scope() {
  return {
    tenantId: getDefaultTenantId(),
    branchId: getDefaultBranchId(),
  };
}

function requireBranch(db: Parameters<typeof getBranchData>[0], tenantId: string, branchId: string): BranchData {
  const branch = getBranchData(db, tenantId, branchId);
  if (!branch) throw new Error("Default tenant/branch not found. Run npm run db:seed.");
  return branch;
}

function writeLedger(
  branch: BranchData,
  input: { stockId: string; stockName: string; delta: number; reason: LedgerDoc["reason"]; note?: string },
) {
  const id = newId("ldg");
  branch.ledger[id] = {
    stockId: input.stockId,
    stockName: input.stockName,
    delta: input.delta,
    reason: input.reason,
    note: input.note ?? "",
    createdAt: nowIso(),
  };
}

function consumeRecipes(branch: BranchData, cart: CartItem[]) {
  for (const item of cart) {
    const recipe = branch.recipes[item.productId];
    if (!recipe) continue;
    for (const line of recipe.lines) {
      const stock = branch.stock[line.stockId];
      if (!stock) continue;
      const delta = -(line.quantity * item.quantity);
      stock.quantity = Math.max(0, Math.round((stock.quantity + delta) * 100) / 100);
      stock.updatedAt = nowIso();
      writeLedger(branch, {
        stockId: line.stockId,
        stockName: stock.name,
        delta,
        reason: "sale",
        note: `Order consumption · ${item.name}`,
      });
    }
  }
}

function restoreRecipes(branch: BranchData, order: OrderDoc) {
  for (const item of order.items) {
    if (!item.productId) continue;
    const recipe = branch.recipes[item.productId];
    if (!recipe) continue;
    for (const line of recipe.lines) {
      const stock = branch.stock[line.stockId];
      if (!stock) continue;
      const delta = line.quantity * item.quantity;
      stock.quantity = Math.round((stock.quantity + delta) * 100) / 100;
      stock.updatedAt = nowIso();
      writeLedger(branch, {
        stockId: line.stockId,
        stockName: stock.name,
        delta,
        reason: "adjust",
        note: `Refund restore · ${item.name}`,
      });
    }
  }
}

export async function ensureTenantBranch(input?: {
  tenantName?: string;
  branchName?: string;
  location?: string;
}) {
  const { tenantId, branchId } = scope();
  const stamp = nowIso();
  const tenant: TenantDoc = {
    name: input?.tenantName ?? "My Café",
    createdAt: stamp,
    updatedAt: stamp,
  };
  const branch: BranchDoc = {
    name: input?.branchName ?? "Main branch",
    location: input?.location ?? "Add your location",
    createdAt: stamp,
    updatedAt: stamp,
  };

  withMemoryDb((db) => {
    const existingTenant = db.tenants[tenantId];
    const existingBranch = db.branches[tenantId]?.[branchId]?.branch;
    ensureBranchSlot(
      db,
      tenantId,
      branchId,
      existingTenant ? { ...existingTenant, name: tenant.name, updatedAt: stamp } : tenant,
      existingBranch
        ? { ...existingBranch, name: branch.name, location: branch.location, updatedAt: stamp }
        : branch,
    );
    const data = getBranchData(db, tenantId, branchId)!;
    if (!data.settings) {
      data.settings = { ...DEFAULT_SETTINGS, categories: [...DEFAULT_SETTINGS.categories], updatedAt: stamp };
    }
    if (!data.counters?.orderNumber) data.counters = { orderNumber: 1000 };
  });

  return { tenantId, branchId };
}

export async function getBootstrap(): Promise<AppState> {
  const { tenantId, branchId } = scope();
  const needsSeed = withMemoryDb((db) => {
    const tenant = db.tenants[tenantId];
    const branchData = getBranchData(db, tenantId, branchId);
    return !tenant || !branchData;
  });
  if (needsSeed) {
    await ensureTenantBranch();
  }

  const meta = withMemoryDb((db) => {
    const tenant = db.tenants[tenantId];
    const branchData = getBranchData(db, tenantId, branchId);
    if (!tenant || !branchData) {
      throw new Error("Default tenant/branch not found. Run npm run db:seed.");
    }
    return {
      tenant: { id: tenantId, name: tenant.name },
      branch: { id: branchId, name: branchData.branch.name, location: branchData.branch.location },
    };
  });

  return {
    ...meta,
    products: await listProducts(),
    orders: await listOrders(),
    stock: await listStock(),
    customers: await listCustomers(),
    employees: await listEmployees(),
    activities: await listActivities(),
    settings: await getSettings(),
    recipes: await listRecipes(),
    modifierGroups: await listModifierGroups(),
    ledger: await listLedger(),
    waste: await listWaste(),
    purchaseOrders: await listPurchaseOrders(),
    feedback: await listFeedback(),
    campaigns: await listCampaigns(),
  };
}

export async function listProducts(): Promise<Product[]> {
  const { tenantId, branchId } = scope();
  return withMemoryDb((db) => {
    const branch = getBranchData(db, tenantId, branchId);
    if (!branch) return [];
    return Object.entries(branch.products)
      .map(([id, product]) => mapProduct(id, product))
      .sort((a, b) => a.name.localeCompare(b.name));
  });
}

export async function createProduct(input: {
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
}): Promise<Product> {
  const { tenantId, branchId } = scope();
  const stamp = nowIso();
  const id = newId("prod");
  const data: ProductDoc = {
    name: input.name,
    category: input.category,
    price: Math.round(input.price),
    cost: Math.round(input.cost ?? 0),
    emoji: input.emoji ?? "C",
    imageUrl: input.imageUrl?.trim() || undefined,
    description: input.description?.trim() || undefined,
    available: input.available !== false,
    popular: Boolean(input.popular),
    modifierGroupIds: input.modifierGroupIds?.length ? input.modifierGroupIds : undefined,
    createdAt: stamp,
    updatedAt: stamp,
  };

  return withMemoryDb((db) => {
    const branch = requireBranch(db, tenantId, branchId);
    branch.products[id] = data;
    return mapProduct(id, data);
  });
}

export async function patchProduct(
  id: string,
  patch: {
    toggleAvailable?: boolean;
    available?: boolean;
    name?: string;
    category?: string;
    price?: number;
    cost?: number;
    emoji?: string;
    popular?: boolean;
    imageUrl?: string | null;
    description?: string | null;
    modifierGroupIds?: string[];
  },
): Promise<Product> {
  const { tenantId, branchId } = scope();
  return withMemoryDb((db) => {
    const branch = requireBranch(db, tenantId, branchId);
    const current = branch.products[id];
    if (!current) throw new Error("Product not found");

    const next: ProductDoc = { ...current, updatedAt: nowIso() };
    if (patch.toggleAvailable) next.available = !current.available;
    if (typeof patch.available === "boolean") next.available = patch.available;
    if (typeof patch.name === "string") next.name = patch.name.trim();
    if (typeof patch.category === "string") next.category = patch.category.trim();
    if (typeof patch.price === "number") next.price = Math.round(patch.price);
    if (typeof patch.cost === "number") next.cost = Math.round(patch.cost);
    if (typeof patch.emoji === "string") next.emoji = patch.emoji;
    if (typeof patch.popular === "boolean") next.popular = patch.popular;
    if (patch.imageUrl === null) delete next.imageUrl;
    else if (typeof patch.imageUrl === "string") next.imageUrl = patch.imageUrl || undefined;
    if (patch.description === null) delete next.description;
    else if (typeof patch.description === "string") next.description = patch.description || undefined;
    if (Array.isArray(patch.modifierGroupIds)) next.modifierGroupIds = patch.modifierGroupIds;
    branch.products[id] = next;
    return mapProduct(id, next);
  });
}

export async function deleteProduct(id: string): Promise<void> {
  const { tenantId, branchId } = scope();
  withMemoryDb((db) => {
    const branch = requireBranch(db, tenantId, branchId);
    if (!branch.products[id]) throw new Error("Product not found");
    delete branch.products[id];
    delete branch.recipes[id];
  });
}

export async function listOrders(): Promise<Order[]> {
  const { tenantId, branchId } = scope();
  return withMemoryDb((db) => {
    const branch = getBranchData(db, tenantId, branchId);
    if (!branch) return [];
    return Object.entries(branch.orders)
      .map(([id, order]) => mapOrder(id, order))
      .sort((a, b) => b.placedAtIso.localeCompare(a.placedAtIso));
  });
}

export async function createOrder(input: {
  cart: CartItem[];
  type: Order["type"];
  customer: string;
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
}): Promise<Order> {
  const { tenantId, branchId } = scope();
  const settings = await getSettings();
  const { subtotal, tax, serviceCharge, discount, tip, total } = computeOrderMoney(input.cart, settings, {
    discount: input.discount,
    tip: input.tip,
  });
  const itemCount = input.cart.reduce((sum, item) => sum + item.quantity, 0);
  const stamp = nowIso();
  const orderId = newId("ord");
  const activityId = newId("act");

  return withMemoryDb((db) => {
    const branch = requireBranch(db, tenantId, branchId);
    const number = (branch.counters.orderNumber || 1000) + 1;
    branch.counters.orderNumber = number;

    const order: OrderDoc = {
      number,
      customer: input.customer,
      customerId: input.customerId,
      type: toDbOrderType(input.type),
      status: "RECEIVED",
      total,
      subtotal,
      tax,
      serviceCharge,
      discount,
      tip,
      paymentMethod: input.paymentMethod || "Cash",
      amountTendered: typeof input.amountTendered === "number" ? Math.round(input.amountTendered) : undefined,
      changeDue: typeof input.changeDue === "number" ? Math.round(input.changeDue) : undefined,
      itemCount,
      items: input.cart.map((item) => ({
        productId: item.productId || null,
        name: item.name,
        price: Math.round(item.price),
        quantity: item.quantity,
        modifiers: item.modifiers ?? [],
      })),
      createdAt: stamp,
      updatedAt: stamp,
    };

    branch.orders[orderId] = order;
    consumeRecipes(branch, input.cart);

    if (input.customerId && branch.customers[input.customerId]) {
      const customer = branch.customers[input.customerId];
      const redeemed = Math.max(0, Math.round(input.pointsRedeemed ?? 0));
      if (redeemed > 0) customer.points = Math.max(0, customer.points - redeemed);
      customer.visits += 1;
      customer.spent += total;
      customer.points += Math.floor(total / 100);
      customer.lastVisit = "Today";
      customer.segment = inferSegment(customer.visits, customer.spent);
      customer.updatedAt = stamp;
      if (input.cart[0]) customer.favorite = input.cart[0].name;
    }

    branch.activities[activityId] = {
      title: `Order #${number} received`,
      detail: `${input.type} · ${order.paymentMethod} · ${settings.currency} ${order.total.toLocaleString()}`,
      tone: "GREEN",
      createdAt: stamp,
    };

    return mapOrder(orderId, order);
  });
}

export async function advanceOrder(id: string): Promise<Order> {
  const { tenantId, branchId } = scope();
  return withMemoryDb((db) => {
    const branch = requireBranch(db, tenantId, branchId);
    const current = branch.orders[id];
    if (!current) throw new Error("Order not found");
    const next: OrderDoc = {
      ...current,
      status: nextOrderStatus(current.status),
      updatedAt: nowIso(),
    };
    branch.orders[id] = next;
    return mapOrder(id, next);
  });
}

export async function refundOrder(id: string): Promise<Order> {
  const { tenantId, branchId } = scope();
  return withMemoryDb((db) => {
    const branch = requireBranch(db, tenantId, branchId);
    const current = branch.orders[id];
    if (!current) throw new Error("Order not found");
    if (current.status === "REFUNDED") return mapOrder(id, current);
    restoreRecipes(branch, current);
    if (current.customerId && branch.customers[current.customerId]) {
      const customer = branch.customers[current.customerId];
      customer.spent = Math.max(0, customer.spent - current.total);
      customer.points = Math.max(0, customer.points - Math.floor(current.total / 100));
      customer.segment = inferSegment(customer.visits, customer.spent);
      customer.updatedAt = nowIso();
    }
    const next: OrderDoc = { ...current, status: "REFUNDED", updatedAt: nowIso() };
    branch.orders[id] = next;
    const activityId = newId("act");
    const settings = mapSettings(branch.settings);
    branch.activities[activityId] = {
      title: `Order #${current.number} refunded`,
      detail: `${settings.currency} ${current.total.toLocaleString()} returned`,
      tone: "AMBER",
      createdAt: nowIso(),
    };
    return mapOrder(id, next);
  });
}

export async function listStock(): Promise<StockItem[]> {
  const { tenantId, branchId } = scope();
  return withMemoryDb((db) => {
    const branch = getBranchData(db, tenantId, branchId);
    if (!branch) return [];
    return Object.entries(branch.stock)
      .map(([id, item]) => mapStockItem(id, item))
      .sort((a, b) => a.name.localeCompare(b.name));
  });
}

export async function createStock(input: {
  name: string;
  category: string;
  unit: string;
  quantity?: number;
  minimum?: number;
  value?: number;
  supplier?: string;
  trend?: number;
}): Promise<StockItem> {
  const { tenantId, branchId } = scope();
  const stamp = nowIso();
  const id = newId("stk");
  const data: StockDoc = {
    name: input.name,
    category: input.category,
    unit: input.unit,
    quantity: input.quantity ?? 0,
    minimum: input.minimum ?? 0,
    value: Math.round(input.value ?? 0),
    supplier: input.supplier ?? "",
    trend: Math.round(input.trend ?? 0),
    createdAt: stamp,
    updatedAt: stamp,
  };

  return withMemoryDb((db) => {
    const branch = requireBranch(db, tenantId, branchId);
    branch.stock[id] = data;
    if ((input.quantity ?? 0) !== 0) {
      writeLedger(branch, {
        stockId: id,
        stockName: data.name,
        delta: data.quantity,
        reason: "receive",
        note: "Opening stock",
      });
    }
    return mapStockItem(id, data);
  });
}

export async function patchStock(
  id: string,
  patch: Partial<Pick<StockItem, "name" | "category" | "unit" | "minimum" | "value" | "supplier" | "trend">>,
): Promise<StockItem> {
  const { tenantId, branchId } = scope();
  return withMemoryDb((db) => {
    const branch = requireBranch(db, tenantId, branchId);
    const current = branch.stock[id];
    if (!current) throw new Error("Stock item not found");
    const next: StockDoc = {
      ...current,
      ...Object.fromEntries(
        Object.entries(patch).filter(([, value]) => value !== undefined),
      ),
      updatedAt: nowIso(),
    };
    if (typeof patch.value === "number") next.value = Math.round(patch.value);
    if (typeof patch.minimum === "number") next.minimum = patch.minimum;
    branch.stock[id] = next;
    return mapStockItem(id, next);
  });
}

export async function deleteStock(id: string): Promise<void> {
  const { tenantId, branchId } = scope();
  withMemoryDb((db) => {
    const branch = requireBranch(db, tenantId, branchId);
    if (!branch.stock[id]) throw new Error("Stock item not found");
    delete branch.stock[id];
  });
}

export async function adjustStock(id: string, amount?: number, quantity?: number, note?: string): Promise<StockItem> {
  const { tenantId, branchId } = scope();
  return withMemoryDb((db) => {
    const branch = requireBranch(db, tenantId, branchId);
    const current = branch.stock[id];
    if (!current) throw new Error("Stock item not found");

    let nextQty = current.quantity;
    if (typeof amount === "number") nextQty = Math.max(0, Math.round((current.quantity + amount) * 100) / 100);
    else if (typeof quantity === "number") nextQty = Math.max(0, Math.round(quantity * 100) / 100);
    const delta = Math.round((nextQty - current.quantity) * 100) / 100;

    const next: StockDoc = { ...current, quantity: nextQty, updatedAt: nowIso() };
    branch.stock[id] = next;
    if (delta !== 0) {
      writeLedger(branch, {
        stockId: id,
        stockName: current.name,
        delta,
        reason: typeof quantity === "number" ? "count" : "adjust",
        note: note || (typeof quantity === "number" ? "Stock count" : "Manual adjustment"),
      });
    }
    return mapStockItem(id, next);
  });
}

export async function recordWaste(input: {
  stockId: string;
  quantity: number;
  reason: string;
}): Promise<WasteRecord> {
  const { tenantId, branchId } = scope();
  return withMemoryDb((db) => {
    const branch = requireBranch(db, tenantId, branchId);
    const stock = branch.stock[input.stockId];
    if (!stock) throw new Error("Stock item not found");
    const qty = Math.max(0, Math.round(input.quantity * 100) / 100);
    stock.quantity = Math.max(0, Math.round((stock.quantity - qty) * 100) / 100);
    stock.updatedAt = nowIso();
    const id = newId("wst");
    const doc: WasteDoc = {
      stockId: input.stockId,
      stockName: stock.name,
      quantity: qty,
      reason: input.reason || "Waste",
      createdAt: nowIso(),
    };
    branch.waste[id] = doc;
    writeLedger(branch, {
      stockId: input.stockId,
      stockName: stock.name,
      delta: -qty,
      reason: "waste",
      note: doc.reason,
    });
    return mapWaste(id, doc);
  });
}

export async function listWaste(): Promise<WasteRecord[]> {
  const { tenantId, branchId } = scope();
  return withMemoryDb((db) => {
    const branch = getBranchData(db, tenantId, branchId);
    if (!branch) return [];
    return Object.entries(branch.waste)
      .map(([id, item]) => mapWaste(id, item))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  });
}

export async function listLedger(): Promise<StockLedgerEntry[]> {
  const { tenantId, branchId } = scope();
  return withMemoryDb((db) => {
    const branch = getBranchData(db, tenantId, branchId);
    if (!branch) return [];
    return Object.entries(branch.ledger)
      .map(([id, item]) => mapLedger(id, item))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 200);
  });
}

export async function listPurchaseOrders(): Promise<PurchaseOrder[]> {
  const { tenantId, branchId } = scope();
  return withMemoryDb((db) => {
    const branch = getBranchData(db, tenantId, branchId);
    if (!branch) return [];
    return Object.entries(branch.purchaseOrders)
      .map(([id, item]) => mapPurchaseOrder(id, item))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  });
}

export async function createPurchaseOrder(input: {
  supplier: string;
  lines: { stockId: string; name: string; quantity: number; unitCost: number }[];
  status?: PurchaseOrder["status"];
}): Promise<PurchaseOrder> {
  const { tenantId, branchId } = scope();
  const id = newId("po");
  const stamp = nowIso();
  const total = input.lines.reduce((sum, line) => sum + line.quantity * line.unitCost, 0);
  const doc: PurchaseOrderDoc = {
    supplier: input.supplier.trim(),
    status: toDbPoStatus(input.status ?? "Draft"),
    lines: input.lines,
    total: Math.round(total),
    createdAt: stamp,
    updatedAt: stamp,
  };
  return withMemoryDb((db) => {
    const branch = requireBranch(db, tenantId, branchId);
    branch.purchaseOrders[id] = doc;
    return mapPurchaseOrder(id, doc);
  });
}

export async function patchPurchaseOrder(
  id: string,
  patch: { status?: PurchaseOrder["status"]; supplier?: string },
): Promise<PurchaseOrder> {
  const { tenantId, branchId } = scope();
  return withMemoryDb((db) => {
    const branch = requireBranch(db, tenantId, branchId);
    const current = branch.purchaseOrders[id];
    if (!current) throw new Error("Purchase order not found");
    const next: PurchaseOrderDoc = { ...current, updatedAt: nowIso() };
    if (patch.supplier) next.supplier = patch.supplier.trim();
    if (patch.status) {
      if (current.status !== "RECEIVED" && patch.status === "Received") {
        for (const line of current.lines) {
          const stock = branch.stock[line.stockId];
          if (!stock) continue;
          stock.quantity = Math.round((stock.quantity + line.quantity) * 100) / 100;
          stock.value = Math.round(line.unitCost);
          stock.supplier = current.supplier;
          stock.updatedAt = nowIso();
          writeLedger(branch, {
            stockId: line.stockId,
            stockName: stock.name,
            delta: line.quantity,
            reason: "po",
            note: `PO received · ${current.supplier}`,
          });
        }
      }
      next.status = toDbPoStatus(patch.status);
    }
    branch.purchaseOrders[id] = next;
    return mapPurchaseOrder(id, next);
  });
}

export async function listCustomers(): Promise<Customer[]> {
  const { tenantId, branchId } = scope();
  return withMemoryDb((db) => {
    const branch = getBranchData(db, tenantId, branchId);
    if (!branch) return [];
    return Object.entries(branch.customers)
      .map(([id, customer]) => mapCustomer(id, customer))
      .sort((a, b) => a.name.localeCompare(b.name));
  });
}

export async function createCustomer(input: {
  name: string;
  email?: string;
  phone?: string;
  favorite?: string;
  segment?: Customer["segment"];
}): Promise<Customer> {
  const { tenantId, branchId } = scope();
  const stamp = nowIso();
  const id = newId("cus");
  const data: CustomerDoc = {
    name: input.name.trim(),
    email: input.email?.trim() || "",
    phone: input.phone?.trim() || "",
    visits: 0,
    spent: 0,
    points: 0,
    favorite: input.favorite?.trim() || "",
    segment: toDbSegment(input.segment ?? "New"),
    lastVisit: "Never",
    createdAt: stamp,
    updatedAt: stamp,
  };
  return withMemoryDb((db) => {
    const branch = requireBranch(db, tenantId, branchId);
    branch.customers[id] = data;
    return mapCustomer(id, data);
  });
}

export async function patchCustomer(
  id: string,
  patch: Partial<Pick<Customer, "name" | "email" | "phone" | "favorite" | "segment" | "points">>,
): Promise<Customer> {
  const { tenantId, branchId } = scope();
  return withMemoryDb((db) => {
    const branch = requireBranch(db, tenantId, branchId);
    const current = branch.customers[id];
    if (!current) throw new Error("Customer not found");
    const next: CustomerDoc = { ...current, updatedAt: nowIso() };
    if (typeof patch.name === "string") next.name = patch.name.trim();
    if (typeof patch.email === "string") next.email = patch.email.trim();
    if (typeof patch.phone === "string") next.phone = patch.phone.trim();
    if (typeof patch.favorite === "string") next.favorite = patch.favorite.trim();
    if (patch.segment) next.segment = toDbSegment(patch.segment);
    if (typeof patch.points === "number") next.points = Math.max(0, Math.round(patch.points));
    branch.customers[id] = next;
    return mapCustomer(id, next);
  });
}

export async function deleteCustomer(id: string): Promise<void> {
  const { tenantId, branchId } = scope();
  withMemoryDb((db) => {
    const branch = requireBranch(db, tenantId, branchId);
    if (!branch.customers[id]) throw new Error("Customer not found");
    delete branch.customers[id];
  });
}

export async function listEmployees(): Promise<Employee[]> {
  const { tenantId, branchId } = scope();
  return withMemoryDb((db) => {
    const branch = getBranchData(db, tenantId, branchId);
    if (!branch) return [];
    return Object.entries(branch.employees)
      .map(([id, employee]) => mapEmployee(id, employee))
      .sort((a, b) => a.name.localeCompare(b.name));
  });
}

export async function createEmployee(input: {
  name: string;
  role: string;
  shift?: string;
  status?: Employee["status"];
  hours?: number;
  hourlyRate?: number;
}): Promise<Employee> {
  const { tenantId, branchId } = scope();
  const stamp = nowIso();
  const id = newId("emp");
  const data: EmployeeDoc = {
    name: input.name.trim(),
    role: input.role.trim() || "Cashier",
    shift: input.shift?.trim() || "",
    status: toDbEmployeeStatus(input.status ?? "Scheduled"),
    avatar: initials(input.name),
    hours: input.hours ?? 0,
    hourlyRate: Math.max(0, Math.round(input.hourlyRate ?? 0)),
    createdAt: stamp,
    updatedAt: stamp,
  };
  return withMemoryDb((db) => {
    const branch = requireBranch(db, tenantId, branchId);
    branch.employees[id] = data;
    return mapEmployee(id, data);
  });
}

export async function patchEmployee(
  id: string,
  patch: Partial<Pick<Employee, "name" | "role" | "shift" | "status" | "hours" | "hourlyRate">>,
): Promise<Employee> {
  const { tenantId, branchId } = scope();
  return withMemoryDb((db) => {
    const branch = requireBranch(db, tenantId, branchId);
    const current = branch.employees[id];
    if (!current) throw new Error("Employee not found");
    const next: EmployeeDoc = { ...current, updatedAt: nowIso() };
    if (typeof patch.name === "string") {
      next.name = patch.name.trim();
      next.avatar = initials(next.name);
    }
    if (typeof patch.role === "string") next.role = patch.role.trim();
    if (typeof patch.shift === "string") next.shift = patch.shift.trim();
    if (patch.status) next.status = toDbEmployeeStatus(patch.status);
    if (typeof patch.hours === "number") next.hours = Math.max(0, patch.hours);
    if (typeof patch.hourlyRate === "number") next.hourlyRate = Math.max(0, Math.round(patch.hourlyRate));
    branch.employees[id] = next;
    return mapEmployee(id, next);
  });
}

export async function deleteEmployee(id: string): Promise<void> {
  const { tenantId, branchId } = scope();
  withMemoryDb((db) => {
    const branch = requireBranch(db, tenantId, branchId);
    if (!branch.employees[id]) throw new Error("Employee not found");
    delete branch.employees[id];
  });
}

export async function listActivities() {
  const { tenantId, branchId } = scope();
  return withMemoryDb((db) => {
    const branch = getBranchData(db, tenantId, branchId);
    if (!branch) return [];
    return Object.entries(branch.activities)
      .sort((a, b) => b[1].createdAt.localeCompare(a[1].createdAt))
      .slice(0, 50)
      .map(([id, activity]) => mapActivity(id, activity));
  });
}

export async function addActivity(input: Omit<Activity, "id" | "time">): Promise<Activity> {
  const { tenantId, branchId } = scope();
  const id = newId("act");
  const data: ActivityDoc = {
    title: input.title,
    detail: input.detail,
    tone: toDbActivityTone(input.tone),
    createdAt: nowIso(),
  };

  return withMemoryDb((db) => {
    const branch = requireBranch(db, tenantId, branchId);
    branch.activities[id] = data;
    return mapActivity(id, data);
  });
}

export async function getSettings(): Promise<CafeSettings> {
  const { tenantId, branchId } = scope();
  return withMemoryDb((db) => {
    const branch = getBranchData(db, tenantId, branchId);
    return mapSettings(branch?.settings);
  });
}

export async function updateSettings(patch: Partial<CafeSettings> & { tenantName?: string; branchName?: string; location?: string }) {
  const { tenantId, branchId } = scope();
  const stamp = nowIso();
  return withMemoryDb((db) => {
    const branch = requireBranch(db, tenantId, branchId);
    const current = mapSettings(branch.settings);
    const next: SettingsDoc = {
      ...current,
      ...patch,
      categories: patch.categories ?? current.categories,
      updatedAt: stamp,
    };
    delete (next as SettingsDoc & { tenantName?: string }).tenantName;
    delete (next as SettingsDoc & { branchName?: string }).branchName;
    delete (next as SettingsDoc & { location?: string }).location;
    branch.settings = next;

    if (patch.tenantName && db.tenants[tenantId]) {
      db.tenants[tenantId] = { ...db.tenants[tenantId], name: patch.tenantName.trim(), updatedAt: stamp };
    }
    if (patch.branchName || patch.location) {
      branch.branch = {
        ...branch.branch,
        name: patch.branchName?.trim() || branch.branch.name,
        location: patch.location?.trim() || branch.branch.location,
        updatedAt: stamp,
      };
    }

    return {
      settings: mapSettings(next),
      tenant: { id: tenantId, name: db.tenants[tenantId]?.name || "My Café" },
      branch: { id: branchId, name: branch.branch.name, location: branch.branch.location },
    };
  });
}

export async function listRecipes(): Promise<Recipe[]> {
  const { tenantId, branchId } = scope();
  return withMemoryDb((db) => {
    const branch = getBranchData(db, tenantId, branchId);
    if (!branch) return [];
    return Object.values(branch.recipes).map(mapRecipe);
  });
}

export async function upsertRecipe(input: Recipe): Promise<Recipe> {
  const { tenantId, branchId } = scope();
  return withMemoryDb((db) => {
    const branch = requireBranch(db, tenantId, branchId);
    if (!branch.products[input.productId]) throw new Error("Product not found");
    const doc: RecipeDoc = {
      productId: input.productId,
      lines: input.lines.filter((line) => line.stockId && line.quantity > 0),
      notes: input.notes?.trim() || undefined,
      updatedAt: nowIso(),
    };
    branch.recipes[input.productId] = doc;

    const cost = doc.lines.reduce((sum, line) => {
      const stock = branch.stock[line.stockId];
      return sum + (stock ? stock.value * line.quantity : 0);
    }, 0);
    const product = branch.products[input.productId];
    product.cost = Math.round(cost);
    product.updatedAt = nowIso();

    return mapRecipe(doc);
  });
}

export async function deleteRecipe(productId: string): Promise<void> {
  const { tenantId, branchId } = scope();
  withMemoryDb((db) => {
    const branch = requireBranch(db, tenantId, branchId);
    delete branch.recipes[productId];
  });
}

export async function listModifierGroups(): Promise<ModifierGroup[]> {
  const { tenantId, branchId } = scope();
  return withMemoryDb((db) => {
    const branch = getBranchData(db, tenantId, branchId);
    if (!branch) return [];
    return Object.entries(branch.modifiers)
      .map(([id, item]) => mapModifierGroup(id, item))
      .sort((a, b) => a.name.localeCompare(b.name));
  });
}

export async function createModifierGroup(input: Omit<ModifierGroup, "id">): Promise<ModifierGroup> {
  const { tenantId, branchId } = scope();
  const id = newId("mod");
  const stamp = nowIso();
  const doc: ModifierGroupDoc = {
    name: input.name.trim(),
    single: Boolean(input.single),
    options: input.options,
    appliesTo: input.appliesTo ?? [],
    createdAt: stamp,
    updatedAt: stamp,
  };
  return withMemoryDb((db) => {
    const branch = requireBranch(db, tenantId, branchId);
    branch.modifiers[id] = doc;
    return mapModifierGroup(id, doc);
  });
}

export async function patchModifierGroup(id: string, patch: Partial<Omit<ModifierGroup, "id">>): Promise<ModifierGroup> {
  const { tenantId, branchId } = scope();
  return withMemoryDb((db) => {
    const branch = requireBranch(db, tenantId, branchId);
    const current = branch.modifiers[id];
    if (!current) throw new Error("Modifier group not found");
    const next: ModifierGroupDoc = {
      ...current,
      name: patch.name?.trim() ?? current.name,
      single: typeof patch.single === "boolean" ? patch.single : current.single,
      options: patch.options ?? current.options,
      appliesTo: patch.appliesTo ?? current.appliesTo,
      updatedAt: nowIso(),
    };
    branch.modifiers[id] = next;
    return mapModifierGroup(id, next);
  });
}

export async function deleteModifierGroup(id: string): Promise<void> {
  const { tenantId, branchId } = scope();
  withMemoryDb((db) => {
    const branch = requireBranch(db, tenantId, branchId);
    if (!branch.modifiers[id]) throw new Error("Modifier group not found");
    delete branch.modifiers[id];
    for (const product of Object.values(branch.products)) {
      if (product.modifierGroupIds) {
        product.modifierGroupIds = product.modifierGroupIds.filter((groupId) => groupId !== id);
      }
    }
  });
}

export async function listFeedback(): Promise<Feedback[]> {
  const { tenantId, branchId } = scope();
  return withMemoryDb((db) => {
    const branch = getBranchData(db, tenantId, branchId);
    if (!branch) return [];
    return Object.entries(branch.feedback)
      .map(([id, item]) => mapFeedback(id, item))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  });
}

export async function createFeedback(input: {
  customerName: string;
  rating: number;
  comment?: string;
}): Promise<Feedback> {
  const { tenantId, branchId } = scope();
  const id = newId("fb");
  const doc: FeedbackDoc = {
    customerName: input.customerName.trim() || "Guest",
    rating: Math.min(5, Math.max(1, Math.round(input.rating))),
    comment: input.comment?.trim() || "",
    createdAt: nowIso(),
  };
  return withMemoryDb((db) => {
    const branch = requireBranch(db, tenantId, branchId);
    branch.feedback[id] = doc;
    return mapFeedback(id, doc);
  });
}

export async function listCampaigns(): Promise<Campaign[]> {
  const { tenantId, branchId } = scope();
  return withMemoryDb((db) => {
    const branch = getBranchData(db, tenantId, branchId);
    if (!branch) return [];
    return Object.entries(branch.campaigns)
      .map(([id, item]) => mapCampaign(id, item))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  });
}

export async function createCampaign(input: {
  title: string;
  audience: string;
  offer: string;
  status?: Campaign["status"];
}): Promise<Campaign> {
  const { tenantId, branchId } = scope();
  const id = newId("cmp");
  const stamp = nowIso();
  const doc: CampaignDoc = {
    title: input.title.trim(),
    audience: input.audience.trim(),
    offer: input.offer.trim(),
    status: toDbCampaignStatus(input.status ?? "Draft"),
    createdAt: stamp,
    updatedAt: stamp,
  };
  return withMemoryDb((db) => {
    const branch = requireBranch(db, tenantId, branchId);
    branch.campaigns[id] = doc;
    return mapCampaign(id, doc);
  });
}

export async function patchCampaign(id: string, patch: Partial<Pick<Campaign, "title" | "audience" | "offer" | "status">>): Promise<Campaign> {
  const { tenantId, branchId } = scope();
  return withMemoryDb((db) => {
    const branch = requireBranch(db, tenantId, branchId);
    const current = branch.campaigns[id];
    if (!current) throw new Error("Campaign not found");
    const next: CampaignDoc = {
      ...current,
      title: patch.title?.trim() ?? current.title,
      audience: patch.audience?.trim() ?? current.audience,
      offer: patch.offer?.trim() ?? current.offer,
      status: patch.status ? toDbCampaignStatus(patch.status) : current.status,
      updatedAt: nowIso(),
    };
    branch.campaigns[id] = next;
    return mapCampaign(id, next);
  });
}

export async function deleteCampaign(id: string): Promise<void> {
  const { tenantId, branchId } = scope();
  withMemoryDb((db) => {
    const branch = requireBranch(db, tenantId, branchId);
    if (!branch.campaigns[id]) throw new Error("Campaign not found");
    delete branch.campaigns[id];
  });
}
