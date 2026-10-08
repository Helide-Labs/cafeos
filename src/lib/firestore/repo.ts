import { DEFAULT_SETTINGS } from "@/lib/defaults";
import { newId } from "@/lib/data/memory-store";
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
import {
  branchCollection,
  branchRef,
  countersRef,
  settingsRef,
  tenantRef,
} from "@/lib/firestore/paths";
import { getDb } from "@/lib/firebase";
import { computeOrderMoney } from "@/lib/money";
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
  OrderItemDoc,
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
import { getDefaultBranchId, getDefaultTenantId } from "@/lib/tenant";
import type { Transaction } from "firebase-admin/firestore";

function scope() {
  return {
    tenantId: getDefaultTenantId(),
    branchId: getDefaultBranchId(),
  };
}

function col(tenantId: string, branchId: string, name: string) {
  return branchCollection(tenantId, branchId, name);
}

type LedgerInput = {
  stockId: string;
  stockName: string;
  delta: number;
  reason: LedgerDoc["reason"];
  note?: string;
};

function writeLedgerTx(
  tx: Transaction,
  tenantId: string,
  branchId: string,
  stamp: string,
  input: LedgerInput,
) {
  const id = newId("ldg");
  tx.set(col(tenantId, branchId, "ledger").doc(id), {
    stockId: input.stockId,
    stockName: input.stockName,
    delta: input.delta,
    reason: input.reason,
    note: input.note ?? "",
    createdAt: stamp,
  } satisfies LedgerDoc);
}

async function readRecipeStockDeltas(
  tx: Transaction,
  tenantId: string,
  branchId: string,
  items: OrderItemDoc[],
  sign: 1 | -1,
): Promise<
  Map<
    string,
    { stock: StockDoc; netDelta: number; name: string; ledgerNotes: string[] }
  >
> {
  const updates = new Map<
    string,
    { stock: StockDoc; netDelta: number; name: string; ledgerNotes: string[] }
  >();

  for (const item of items) {
    if (!item.productId) continue;
    const recipeSnap = await tx.get(col(tenantId, branchId, "recipes").doc(item.productId));
    if (!recipeSnap.exists) continue;
    const recipe = recipeSnap.data() as RecipeDoc;
    for (const line of recipe.lines) {
      const delta = sign * line.quantity * item.quantity;
      const entry = updates.get(line.stockId);
      if (entry) {
        entry.netDelta += delta;
        entry.ledgerNotes.push(item.name);
        continue;
      }
      const stockSnap = await tx.get(col(tenantId, branchId, "stock").doc(line.stockId));
      if (!stockSnap.exists) continue;
      const stock = stockSnap.data() as StockDoc;
      updates.set(line.stockId, {
        stock,
        netDelta: delta,
        name: stock.name,
        ledgerNotes: [item.name],
      });
    }
  }

  return updates;
}

function applyStockDeltas(
  tx: Transaction,
  tenantId: string,
  branchId: string,
  stamp: string,
  updates: Map<
    string,
    { stock: StockDoc; netDelta: number; name: string; ledgerNotes: string[] }
  >,
  reason: LedgerDoc["reason"],
  notePrefix: string,
  clampAtZero: boolean,
) {
  for (const [stockId, entry] of updates) {
    let quantity = entry.stock.quantity + entry.netDelta;
    if (clampAtZero) quantity = Math.max(0, Math.round(quantity * 100) / 100);
    else quantity = Math.round(quantity * 100) / 100;
    tx.set(col(tenantId, branchId, "stock").doc(stockId), {
      ...entry.stock,
      quantity,
      updatedAt: stamp,
    } satisfies StockDoc);
    if (entry.netDelta !== 0) {
      writeLedgerTx(tx, tenantId, branchId, stamp, {
        stockId,
        stockName: entry.name,
        delta: entry.netDelta,
        reason,
        note: `${notePrefix} · ${entry.ledgerNotes[0] ?? ""}`,
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

  await tenantRef(tenantId).set(
    {
      name: input?.tenantName ?? "My Café",
      createdAt: stamp,
      updatedAt: stamp,
    } satisfies TenantDoc,
    { merge: true },
  );

  await branchRef(tenantId, branchId).set(
    {
      name: input?.branchName ?? "Main branch",
      location: input?.location ?? "Add your location",
      createdAt: stamp,
      updatedAt: stamp,
    } satisfies BranchDoc,
    { merge: true },
  );

  const counters = await countersRef(tenantId, branchId).get();
  if (!counters.exists) {
    await countersRef(tenantId, branchId).set({ orderNumber: 1000 });
  }

  const settings = await settingsRef(tenantId, branchId).get();
  if (!settings.exists) {
    await settingsRef(tenantId, branchId).set({
      ...DEFAULT_SETTINGS,
      categories: [...DEFAULT_SETTINGS.categories],
      updatedAt: stamp,
    } satisfies SettingsDoc);
  }

  return { tenantId, branchId };
}

export async function getBootstrap(): Promise<AppState> {
  const { tenantId, branchId } = scope();
  let [tenantSnap, branchSnap] = await Promise.all([
    tenantRef(tenantId).get(),
    branchRef(tenantId, branchId).get(),
  ]);

  if (!tenantSnap.exists || !branchSnap.exists) {
    await ensureTenantBranch();
    [tenantSnap, branchSnap] = await Promise.all([
      tenantRef(tenantId).get(),
      branchRef(tenantId, branchId).get(),
    ]);
  }

  if (!tenantSnap.exists || !branchSnap.exists) {
    throw new Error("Default tenant/branch not found. Run npm run db:seed.");
  }

  const tenant = tenantSnap.data() as TenantDoc;
  const branch = branchSnap.data() as BranchDoc;

  const [
    products,
    orders,
    stock,
    customers,
    employees,
    activities,
    settings,
    recipes,
    modifierGroups,
    ledger,
    waste,
    purchaseOrders,
    feedback,
    campaigns,
  ] = await Promise.all([
    listProducts(),
    listOrders(),
    listStock(),
    listCustomers(),
    listEmployees(),
    listActivities(),
    getSettings(),
    listRecipes(),
    listModifierGroups(),
    listLedger(),
    listWaste(),
    listPurchaseOrders(),
    listFeedback(),
    listCampaigns(),
  ]);

  return {
    tenant: { id: tenantId, name: tenant.name },
    branch: { id: branchId, name: branch.name, location: branch.location },
    products,
    orders,
    stock,
    customers,
    employees,
    activities,
    settings,
    recipes,
    modifierGroups,
    ledger,
    waste,
    purchaseOrders,
    feedback,
    campaigns,
  };
}

export async function listProducts(): Promise<Product[]> {
  const { tenantId, branchId } = scope();
  const snap = await col(tenantId, branchId, "products").get();
  return snap.docs
    .map((doc) => mapProduct(doc.id, doc.data() as ProductDoc))
    .sort((a, b) => a.name.localeCompare(b.name));
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
  await col(tenantId, branchId, "products").doc(id).set(data);
  return mapProduct(id, data);
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
  const ref = col(tenantId, branchId, "products").doc(id);
  const existing = await ref.get();
  if (!existing.exists) throw new Error("Product not found");

  const current = existing.data() as ProductDoc;
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

  await ref.set(next);
  return mapProduct(id, next);
}

export async function deleteProduct(id: string): Promise<void> {
  const { tenantId, branchId } = scope();
  const ref = col(tenantId, branchId, "products").doc(id);
  const existing = await ref.get();
  if (!existing.exists) throw new Error("Product not found");
  const batch = getDb().batch();
  batch.delete(ref);
  batch.delete(col(tenantId, branchId, "recipes").doc(id));
  await batch.commit();
}

export async function listOrders(): Promise<Order[]> {
  const { tenantId, branchId } = scope();
  const snap = await col(tenantId, branchId, "orders").get();
  return snap.docs
    .map((doc) => mapOrder(doc.id, doc.data() as OrderDoc))
    .sort((a, b) => b.placedAtIso.localeCompare(a.placedAtIso));
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
  const orderRef = col(tenantId, branchId, "orders").doc(orderId);
  const counterRef = countersRef(tenantId, branchId);

  const orderItems: OrderItemDoc[] = input.cart.map((item) => ({
    productId: item.productId || null,
    name: item.name,
    price: Math.round(item.price),
    quantity: item.quantity,
    modifiers: item.modifiers ?? [],
  }));

  const customerRef = input.customerId
    ? col(tenantId, branchId, "customers").doc(input.customerId)
    : null;

  const created = await getDb().runTransaction(async (tx) => {
    const counterSnap = await tx.get(counterRef);
    const current = counterSnap.exists ? Number(counterSnap.data()?.orderNumber ?? 1000) : 1000;
    const number = current + 1;

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
      items: orderItems,
      createdAt: stamp,
      updatedAt: stamp,
    };

    const stockUpdates = await readRecipeStockDeltas(tx, tenantId, branchId, orderItems, -1);
    const customerSnap = customerRef ? await tx.get(customerRef) : null;

    applyStockDeltas(tx, tenantId, branchId, stamp, stockUpdates, "sale", "Order consumption", true);

    if (customerSnap?.exists) {
      const customer = customerSnap.data() as CustomerDoc;
      const redeemed = Math.max(0, Math.round(input.pointsRedeemed ?? 0));
      const next: CustomerDoc = {
        ...customer,
        visits: customer.visits + 1,
        spent: customer.spent + total,
        points: Math.max(0, customer.points - redeemed) + Math.floor(total / 100),
        lastVisit: "Today",
        segment: inferSegment(customer.visits + 1, customer.spent + total),
        updatedAt: stamp,
      };
      if (input.cart[0]) next.favorite = input.cart[0].name;
      tx.set(customerRef!, next);
    }

    tx.set(counterRef, { orderNumber: number }, { merge: true });
    tx.set(orderRef, order);
    tx.set(col(tenantId, branchId, "activities").doc(activityId), {
      title: `Order #${number} received`,
      detail: `${input.type} · ${order.paymentMethod} · ${settings.currency} ${order.total.toLocaleString()}`,
      tone: "GREEN",
      createdAt: stamp,
    } satisfies ActivityDoc);

    return order;
  });

  return mapOrder(orderId, created);
}

export async function advanceOrder(id: string): Promise<Order> {
  const { tenantId, branchId } = scope();
  const ref = col(tenantId, branchId, "orders").doc(id);
  const existing = await ref.get();
  if (!existing.exists) throw new Error("Order not found");

  const current = existing.data() as OrderDoc;
  const next: OrderDoc = {
    ...current,
    status: nextOrderStatus(current.status),
    updatedAt: nowIso(),
  };
  await ref.set(next);
  return mapOrder(id, next);
}

export async function refundOrder(id: string): Promise<Order> {
  const { tenantId, branchId } = scope();
  const ref = col(tenantId, branchId, "orders").doc(id);
  const existing = await ref.get();
  if (!existing.exists) throw new Error("Order not found");

  const current = existing.data() as OrderDoc;
  if (current.status === "REFUNDED") return mapOrder(id, current);

  const stamp = nowIso();
  const activityId = newId("act");
  const settings = await getSettings();

  const next = await getDb().runTransaction(async (tx) => {
    const orderSnap = await tx.get(ref);
    if (!orderSnap.exists) throw new Error("Order not found");
    const order = orderSnap.data() as OrderDoc;
    if (order.status === "REFUNDED") return order;

    const stockUpdates = await readRecipeStockDeltas(tx, tenantId, branchId, order.items, 1);
    const customerRef = order.customerId
      ? col(tenantId, branchId, "customers").doc(order.customerId)
      : null;
    const customerSnap = customerRef ? await tx.get(customerRef) : null;

    applyStockDeltas(tx, tenantId, branchId, stamp, stockUpdates, "adjust", "Refund restore", false);

    if (customerSnap?.exists) {
      const customer = customerSnap.data() as CustomerDoc;
      const spent = Math.max(0, customer.spent - order.total);
      tx.set(customerRef!, {
        ...customer,
        spent,
        points: Math.max(0, customer.points - Math.floor(order.total / 100)),
        segment: inferSegment(customer.visits, spent),
        updatedAt: stamp,
      } satisfies CustomerDoc);
    }

    const refunded: OrderDoc = { ...order, status: "REFUNDED", updatedAt: stamp };
    tx.set(ref, refunded);
    tx.set(col(tenantId, branchId, "activities").doc(activityId), {
      title: `Order #${order.number} refunded`,
      detail: `${settings.currency} ${order.total.toLocaleString()} returned`,
      tone: "AMBER",
      createdAt: stamp,
    } satisfies ActivityDoc);
    return refunded;
  });

  return mapOrder(id, next);
}

export async function listStock(): Promise<StockItem[]> {
  const { tenantId, branchId } = scope();
  const snap = await col(tenantId, branchId, "stock").get();
  return snap.docs
    .map((doc) => mapStockItem(doc.id, doc.data() as StockDoc))
    .sort((a, b) => a.name.localeCompare(b.name));
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

  await getDb().runTransaction(async (tx) => {
    tx.set(col(tenantId, branchId, "stock").doc(id), data);
    if ((input.quantity ?? 0) !== 0) {
      writeLedgerTx(tx, tenantId, branchId, stamp, {
        stockId: id,
        stockName: data.name,
        delta: data.quantity,
        reason: "receive",
        note: "Opening stock",
      });
    }
  });

  return mapStockItem(id, data);
}

export async function patchStock(
  id: string,
  patch: Partial<Pick<StockItem, "name" | "category" | "unit" | "minimum" | "value" | "supplier" | "trend">>,
): Promise<StockItem> {
  const { tenantId, branchId } = scope();
  const ref = col(tenantId, branchId, "stock").doc(id);
  const existing = await ref.get();
  if (!existing.exists) throw new Error("Stock item not found");

  const current = existing.data() as StockDoc;
  const next: StockDoc = {
    ...current,
    ...Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)),
    updatedAt: nowIso(),
  };
  if (typeof patch.value === "number") next.value = Math.round(patch.value);
  if (typeof patch.minimum === "number") next.minimum = patch.minimum;

  await ref.set(next);
  return mapStockItem(id, next);
}

export async function deleteStock(id: string): Promise<void> {
  const { tenantId, branchId } = scope();
  const ref = col(tenantId, branchId, "stock").doc(id);
  const existing = await ref.get();
  if (!existing.exists) throw new Error("Stock item not found");
  await ref.delete();
}

export async function adjustStock(
  id: string,
  amount?: number,
  quantity?: number,
  note?: string,
): Promise<StockItem> {
  const { tenantId, branchId } = scope();
  const ref = col(tenantId, branchId, "stock").doc(id);
  const stamp = nowIso();

  const next = await getDb().runTransaction(async (tx) => {
    const existing = await tx.get(ref);
    if (!existing.exists) throw new Error("Stock item not found");
    const current = existing.data() as StockDoc;

    let nextQty = current.quantity;
    if (typeof amount === "number") nextQty = Math.max(0, Math.round((current.quantity + amount) * 100) / 100);
    else if (typeof quantity === "number") nextQty = Math.max(0, Math.round(quantity * 100) / 100);
    const delta = Math.round((nextQty - current.quantity) * 100) / 100;

    const updated: StockDoc = { ...current, quantity: nextQty, updatedAt: stamp };
    tx.set(ref, updated);
    if (delta !== 0) {
      writeLedgerTx(tx, tenantId, branchId, stamp, {
        stockId: id,
        stockName: current.name,
        delta,
        reason: typeof quantity === "number" ? "count" : "adjust",
        note: note || (typeof quantity === "number" ? "Stock count" : "Manual adjustment"),
      });
    }
    return updated;
  });

  return mapStockItem(id, next);
}

export async function recordWaste(input: {
  stockId: string;
  quantity: number;
  reason: string;
}): Promise<WasteRecord> {
  const { tenantId, branchId } = scope();
  const stockRef = col(tenantId, branchId, "stock").doc(input.stockId);
  const stamp = nowIso();
  const wasteId = newId("wst");

  const doc = await getDb().runTransaction(async (tx) => {
    const stockSnap = await tx.get(stockRef);
    if (!stockSnap.exists) throw new Error("Stock item not found");
    const stock = stockSnap.data() as StockDoc;
    const qty = Math.max(0, Math.round(input.quantity * 100) / 100);
    const nextQty = Math.max(0, Math.round((stock.quantity - qty) * 100) / 100);
    tx.set(stockRef, { ...stock, quantity: nextQty, updatedAt: stamp } satisfies StockDoc);

    const wasteDoc: WasteDoc = {
      stockId: input.stockId,
      stockName: stock.name,
      quantity: qty,
      reason: input.reason || "Waste",
      createdAt: stamp,
    };
    tx.set(col(tenantId, branchId, "waste").doc(wasteId), wasteDoc);
    writeLedgerTx(tx, tenantId, branchId, stamp, {
      stockId: input.stockId,
      stockName: stock.name,
      delta: -qty,
      reason: "waste",
      note: wasteDoc.reason,
    });
    return wasteDoc;
  });

  return mapWaste(wasteId, doc);
}

export async function listWaste(): Promise<WasteRecord[]> {
  const { tenantId, branchId } = scope();
  const snap = await col(tenantId, branchId, "waste").get();
  return snap.docs
    .map((doc) => mapWaste(doc.id, doc.data() as WasteDoc))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listLedger(): Promise<StockLedgerEntry[]> {
  const { tenantId, branchId } = scope();
  const snap = await col(tenantId, branchId, "ledger").get();
  return snap.docs
    .map((doc) => mapLedger(doc.id, doc.data() as LedgerDoc))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 200);
}

export async function listPurchaseOrders(): Promise<PurchaseOrder[]> {
  const { tenantId, branchId } = scope();
  const snap = await col(tenantId, branchId, "purchaseOrders").get();
  return snap.docs
    .map((doc) => mapPurchaseOrder(doc.id, doc.data() as PurchaseOrderDoc))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
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
  await col(tenantId, branchId, "purchaseOrders").doc(id).set(doc);
  return mapPurchaseOrder(id, doc);
}

export async function patchPurchaseOrder(
  id: string,
  patch: { status?: PurchaseOrder["status"]; supplier?: string },
): Promise<PurchaseOrder> {
  const { tenantId, branchId } = scope();
  const ref = col(tenantId, branchId, "purchaseOrders").doc(id);
  const stamp = nowIso();

  const next = await getDb().runTransaction(async (tx) => {
    const existing = await tx.get(ref);
    if (!existing.exists) throw new Error("Purchase order not found");
    const current = existing.data() as PurchaseOrderDoc;
    const updated: PurchaseOrderDoc = { ...current, updatedAt: stamp };
    if (patch.supplier) updated.supplier = patch.supplier.trim();

    const receiving =
      Boolean(patch.status) && current.status !== "RECEIVED" && patch.status === "Received";
    const stockSnaps = receiving
      ? await Promise.all(
          current.lines.map((line) => tx.get(col(tenantId, branchId, "stock").doc(line.stockId))),
        )
      : [];

    if (patch.status) {
      if (receiving) {
        for (let i = 0; i < current.lines.length; i++) {
          const line = current.lines[i]!;
          const stockSnap = stockSnaps[i]!;
          if (!stockSnap.exists) continue;
          const stock = stockSnap.data() as StockDoc;
          const quantity = Math.round((stock.quantity + line.quantity) * 100) / 100;
          tx.set(stockSnap.ref, {
            ...stock,
            quantity,
            value: Math.round(line.unitCost),
            supplier: current.supplier,
            updatedAt: stamp,
          } satisfies StockDoc);
          writeLedgerTx(tx, tenantId, branchId, stamp, {
            stockId: line.stockId,
            stockName: stock.name,
            delta: line.quantity,
            reason: "po",
            note: `PO received · ${current.supplier}`,
          });
        }
      }
      updated.status = toDbPoStatus(patch.status);
    }
    tx.set(ref, updated);
    return updated;
  });

  return mapPurchaseOrder(id, next);
}

export async function listCustomers(): Promise<Customer[]> {
  const { tenantId, branchId } = scope();
  const snap = await col(tenantId, branchId, "customers").get();
  return snap.docs
    .map((doc) => mapCustomer(doc.id, doc.data() as CustomerDoc))
    .sort((a, b) => a.name.localeCompare(b.name));
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
  await col(tenantId, branchId, "customers").doc(id).set(data);
  return mapCustomer(id, data);
}

export async function patchCustomer(
  id: string,
  patch: Partial<Pick<Customer, "name" | "email" | "phone" | "favorite" | "segment" | "points">>,
): Promise<Customer> {
  const { tenantId, branchId } = scope();
  const ref = col(tenantId, branchId, "customers").doc(id);
  const existing = await ref.get();
  if (!existing.exists) throw new Error("Customer not found");

  const current = existing.data() as CustomerDoc;
  const next: CustomerDoc = { ...current, updatedAt: nowIso() };
  if (typeof patch.name === "string") next.name = patch.name.trim();
  if (typeof patch.email === "string") next.email = patch.email.trim();
  if (typeof patch.phone === "string") next.phone = patch.phone.trim();
  if (typeof patch.favorite === "string") next.favorite = patch.favorite.trim();
  if (patch.segment) next.segment = toDbSegment(patch.segment);
  if (typeof patch.points === "number") next.points = Math.max(0, Math.round(patch.points));

  await ref.set(next);
  return mapCustomer(id, next);
}

export async function deleteCustomer(id: string): Promise<void> {
  const { tenantId, branchId } = scope();
  const ref = col(tenantId, branchId, "customers").doc(id);
  const existing = await ref.get();
  if (!existing.exists) throw new Error("Customer not found");
  await ref.delete();
}

export async function listEmployees(): Promise<Employee[]> {
  const { tenantId, branchId } = scope();
  const snap = await col(tenantId, branchId, "employees").get();
  return snap.docs
    .map((doc) => mapEmployee(doc.id, doc.data() as EmployeeDoc))
    .sort((a, b) => a.name.localeCompare(b.name));
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
  await col(tenantId, branchId, "employees").doc(id).set(data);
  return mapEmployee(id, data);
}

export async function patchEmployee(
  id: string,
  patch: Partial<Pick<Employee, "name" | "role" | "shift" | "status" | "hours" | "hourlyRate">>,
): Promise<Employee> {
  const { tenantId, branchId } = scope();
  const ref = col(tenantId, branchId, "employees").doc(id);
  const existing = await ref.get();
  if (!existing.exists) throw new Error("Employee not found");

  const current = existing.data() as EmployeeDoc;
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

  await ref.set(next);
  return mapEmployee(id, next);
}

export async function deleteEmployee(id: string): Promise<void> {
  const { tenantId, branchId } = scope();
  const ref = col(tenantId, branchId, "employees").doc(id);
  const existing = await ref.get();
  if (!existing.exists) throw new Error("Employee not found");
  await ref.delete();
}

export async function listActivities() {
  const { tenantId, branchId } = scope();
  const snap = await col(tenantId, branchId, "activities").get();
  return snap.docs
    .map((doc) => mapActivity(doc.id, doc.data() as ActivityDoc))
    .sort((a, b) => b.time.localeCompare(a.time))
    .slice(0, 50);
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
  await col(tenantId, branchId, "activities").doc(id).set(data);
  return mapActivity(id, data);
}

export async function getSettings(): Promise<CafeSettings> {
  const { tenantId, branchId } = scope();
  const snap = await settingsRef(tenantId, branchId).get();
  return mapSettings(snap.exists ? (snap.data() as SettingsDoc) : null);
}

export async function updateSettings(
  patch: Partial<CafeSettings> & { tenantName?: string; branchName?: string; location?: string },
) {
  const { tenantId, branchId } = scope();
  const stamp = nowIso();
  const settingsDocRef = settingsRef(tenantId, branchId);
  const existing = await settingsDocRef.get();
  const current = mapSettings(existing.exists ? (existing.data() as SettingsDoc) : null);

  const next: SettingsDoc = {
    ...current,
    ...patch,
    categories: patch.categories ?? current.categories,
    updatedAt: stamp,
  };
  delete (next as SettingsDoc & { tenantName?: string }).tenantName;
  delete (next as SettingsDoc & { branchName?: string }).branchName;
  delete (next as SettingsDoc & { location?: string }).location;

  await settingsDocRef.set(next);

  if (patch.tenantName) {
    await tenantRef(tenantId).set(
      { name: patch.tenantName.trim(), updatedAt: stamp },
      { merge: true },
    );
  }

  const branchPatch: Partial<BranchDoc> = { updatedAt: stamp };
  if (patch.branchName) branchPatch.name = patch.branchName.trim();
  if (patch.location) branchPatch.location = patch.location.trim();
  if (patch.branchName || patch.location) {
    await branchRef(tenantId, branchId).set(branchPatch, { merge: true });
  }

  const [tenantSnap, branchSnap] = await Promise.all([
    tenantRef(tenantId).get(),
    branchRef(tenantId, branchId).get(),
  ]);
  const tenant = tenantSnap.data() as TenantDoc | undefined;
  const branch = branchSnap.data() as BranchDoc | undefined;

  return {
    settings: mapSettings(next),
    tenant: { id: tenantId, name: tenant?.name || "My Café" },
    branch: {
      id: branchId,
      name: branch?.name || "Main branch",
      location: branch?.location || "Add your location",
    },
  };
}

export async function listRecipes(): Promise<Recipe[]> {
  const { tenantId, branchId } = scope();
  const snap = await col(tenantId, branchId, "recipes").get();
  return snap.docs.map((doc) => mapRecipe(doc.data() as RecipeDoc));
}

export async function upsertRecipe(input: Recipe): Promise<Recipe> {
  const { tenantId, branchId } = scope();
  const productRef = col(tenantId, branchId, "products").doc(input.productId);
  const productSnap = await productRef.get();
  if (!productSnap.exists) throw new Error("Product not found");

  const stamp = nowIso();
  const doc: RecipeDoc = {
    productId: input.productId,
    lines: input.lines.filter((line) => line.stockId && line.quantity > 0),
    notes: input.notes?.trim() || undefined,
    updatedAt: stamp,
  };

  const product = productSnap.data() as ProductDoc;
  let computedCost = 0;
  for (const line of doc.lines) {
    const stockSnap = await col(tenantId, branchId, "stock").doc(line.stockId).get();
    if (stockSnap.exists) {
      const stock = stockSnap.data() as StockDoc;
      computedCost += stock.value * line.quantity;
    }
  }

  const nextProduct: ProductDoc = {
    ...product,
    cost: Math.round(computedCost),
    updatedAt: stamp,
  };

  const batch = getDb().batch();
  batch.set(col(tenantId, branchId, "recipes").doc(input.productId), doc);
  batch.set(productRef, nextProduct);
  await batch.commit();

  return mapRecipe(doc);
}

export async function deleteRecipe(productId: string): Promise<void> {
  const { tenantId, branchId } = scope();
  await col(tenantId, branchId, "recipes").doc(productId).delete();
}

export async function listModifierGroups(): Promise<ModifierGroup[]> {
  const { tenantId, branchId } = scope();
  const snap = await col(tenantId, branchId, "modifiers").get();
  return snap.docs
    .map((doc) => mapModifierGroup(doc.id, doc.data() as ModifierGroupDoc))
    .sort((a, b) => a.name.localeCompare(b.name));
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
  await col(tenantId, branchId, "modifiers").doc(id).set(doc);
  return mapModifierGroup(id, doc);
}

export async function patchModifierGroup(
  id: string,
  patch: Partial<Omit<ModifierGroup, "id">>,
): Promise<ModifierGroup> {
  const { tenantId, branchId } = scope();
  const ref = col(tenantId, branchId, "modifiers").doc(id);
  const existing = await ref.get();
  if (!existing.exists) throw new Error("Modifier group not found");

  const current = existing.data() as ModifierGroupDoc;
  const next: ModifierGroupDoc = {
    ...current,
    name: patch.name?.trim() ?? current.name,
    single: typeof patch.single === "boolean" ? patch.single : current.single,
    options: patch.options ?? current.options,
    appliesTo: patch.appliesTo ?? current.appliesTo,
    updatedAt: nowIso(),
  };
  await ref.set(next);
  return mapModifierGroup(id, next);
}

export async function deleteModifierGroup(id: string): Promise<void> {
  const { tenantId, branchId } = scope();
  const ref = col(tenantId, branchId, "modifiers").doc(id);
  const existing = await ref.get();
  if (!existing.exists) throw new Error("Modifier group not found");

  const productsSnap = await col(tenantId, branchId, "products").get();
  const batch = getDb().batch();
  batch.delete(ref);
  for (const doc of productsSnap.docs) {
    const product = doc.data() as ProductDoc;
    if (product.modifierGroupIds?.includes(id)) {
      batch.set(doc.ref, {
        ...product,
        modifierGroupIds: product.modifierGroupIds.filter((groupId) => groupId !== id),
        updatedAt: nowIso(),
      } satisfies ProductDoc);
    }
  }
  await batch.commit();
}

export async function listFeedback(): Promise<Feedback[]> {
  const { tenantId, branchId } = scope();
  const snap = await col(tenantId, branchId, "feedback").get();
  return snap.docs
    .map((doc) => mapFeedback(doc.id, doc.data() as FeedbackDoc))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
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
  await col(tenantId, branchId, "feedback").doc(id).set(doc);
  return mapFeedback(id, doc);
}

export async function listCampaigns(): Promise<Campaign[]> {
  const { tenantId, branchId } = scope();
  const snap = await col(tenantId, branchId, "campaigns").get();
  return snap.docs
    .map((doc) => mapCampaign(doc.id, doc.data() as CampaignDoc))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
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
  await col(tenantId, branchId, "campaigns").doc(id).set(doc);
  return mapCampaign(id, doc);
}

export async function patchCampaign(
  id: string,
  patch: Partial<Pick<Campaign, "title" | "audience" | "offer" | "status">>,
): Promise<Campaign> {
  const { tenantId, branchId } = scope();
  const ref = col(tenantId, branchId, "campaigns").doc(id);
  const existing = await ref.get();
  if (!existing.exists) throw new Error("Campaign not found");

  const current = existing.data() as CampaignDoc;
  const next: CampaignDoc = {
    ...current,
    title: patch.title?.trim() ?? current.title,
    audience: patch.audience?.trim() ?? current.audience,
    offer: patch.offer?.trim() ?? current.offer,
    status: patch.status ? toDbCampaignStatus(patch.status) : current.status,
    updatedAt: nowIso(),
  };
  await ref.set(next);
  return mapCampaign(id, next);
}

export async function deleteCampaign(id: string): Promise<void> {
  const { tenantId, branchId } = scope();
  const ref = col(tenantId, branchId, "campaigns").doc(id);
  const existing = await ref.get();
  if (!existing.exists) throw new Error("Campaign not found");
  await ref.delete();
}
