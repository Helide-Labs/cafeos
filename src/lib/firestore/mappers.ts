import { DEFAULT_SETTINGS } from "@/lib/defaults";
import type {
  Activity,
  CafeSettings,
  Campaign,
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
import type {
  ActivityDoc,
  ActivityToneDb,
  CampaignDoc,
  CampaignStatusDb,
  CustomerDoc,
  CustomerSegmentDb,
  EmployeeDoc,
  EmployeeStatusDb,
  FeedbackDoc,
  LedgerDoc,
  ModifierGroupDoc,
  OrderDoc,
  OrderStatusDb,
  OrderTypeDb,
  ProductDoc,
  PurchaseOrderDoc,
  PurchaseOrderStatusDb,
  RecipeDoc,
  SettingsDoc,
  StockDoc,
  WasteDoc,
} from "@/lib/firestore/types";

const orderTypeToUi: Record<OrderTypeDb, Order["type"]> = {
  DINE_IN: "Dine in",
  PICKUP: "Pickup",
  DELIVERY: "Delivery",
};

const orderTypeFromUi: Record<Order["type"], OrderTypeDb> = {
  "Dine in": "DINE_IN",
  Pickup: "PICKUP",
  Delivery: "DELIVERY",
};

const orderStatusToUi: Record<OrderStatusDb, Order["status"]> = {
  RECEIVED: "Received",
  PREPARING: "Preparing",
  READY: "Ready",
  COMPLETED: "Completed",
  REFUNDED: "Refunded",
};

const segmentToUi: Record<CustomerSegmentDb, Customer["segment"]> = {
  VIP: "VIP",
  REGULAR: "Regular",
  NEW: "New",
  AT_RISK: "At risk",
};

const segmentFromUi: Record<Customer["segment"], CustomerSegmentDb> = {
  VIP: "VIP",
  Regular: "REGULAR",
  New: "NEW",
  "At risk": "AT_RISK",
};

const employeeStatusToUi: Record<EmployeeStatusDb, Employee["status"]> = {
  WORKING: "Working",
  SCHEDULED: "Scheduled",
  LATE: "Late",
  OFF: "Off",
};

const employeeStatusFromUi: Record<Employee["status"], EmployeeStatusDb> = {
  Working: "WORKING",
  Scheduled: "SCHEDULED",
  Late: "LATE",
  Off: "OFF",
};

const toneToUi: Record<ActivityToneDb, Activity["tone"]> = {
  GREEN: "green",
  AMBER: "amber",
  BLUE: "blue",
  RED: "red",
};

const toneFromUi: Record<Activity["tone"], ActivityToneDb> = {
  green: "GREEN",
  amber: "AMBER",
  blue: "BLUE",
  red: "RED",
};

const poStatusToUi: Record<PurchaseOrderStatusDb, PurchaseOrder["status"]> = {
  DRAFT: "Draft",
  ORDERED: "Ordered",
  RECEIVED: "Received",
};

const poStatusFromUi: Record<PurchaseOrder["status"], PurchaseOrderStatusDb> = {
  Draft: "DRAFT",
  Ordered: "ORDERED",
  Received: "RECEIVED",
};

const campaignStatusToUi: Record<CampaignStatusDb, Campaign["status"]> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
};

const campaignStatusFromUi: Record<Campaign["status"], CampaignStatusDb> = {
  Draft: "DRAFT",
  Active: "ACTIVE",
};

export function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (seconds < 45) return "Just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}

export function mapProduct(id: string, product: ProductDoc): Product {
  return {
    id,
    name: product.name,
    category: product.category,
    price: product.price,
    cost: product.cost,
    emoji: product.emoji,
    imageUrl: product.imageUrl || undefined,
    description: product.description || undefined,
    available: product.available,
    popular: product.popular || undefined,
    modifierGroupIds: product.modifierGroupIds?.length ? product.modifierGroupIds : undefined,
  };
}

export function mapOrder(id: string, order: OrderDoc): Order {
  return {
    id,
    number: `#${order.number}`,
    customer: order.customer,
    customerId: order.customerId || undefined,
    type: orderTypeToUi[order.type],
    status: orderStatusToUi[order.status] ?? "Received",
    total: order.total,
    subtotal: order.subtotal ?? order.total,
    tax: order.tax ?? 0,
    serviceCharge: order.serviceCharge ?? 0,
    discount: order.discount ?? 0,
    tip: order.tip ?? 0,
    paymentMethod: order.paymentMethod || "Cash",
    amountTendered: order.amountTendered,
    changeDue: order.changeDue,
    items: order.itemCount,
    lines: (order.items ?? []).map((item) => ({
      productId: item.productId,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      modifiers: item.modifiers ?? [],
    })),
    placedAt: formatRelativeTime(order.createdAt),
    placedAtIso: order.createdAt,
  };
}

export function mapStockItem(id: string, item: StockDoc): StockItem {
  return {
    id,
    name: item.name,
    category: item.category,
    quantity: item.quantity,
    unit: item.unit,
    minimum: item.minimum,
    value: item.value,
    supplier: item.supplier,
    trend: item.trend,
  };
}

export function mapCustomer(id: string, customer: CustomerDoc): Customer {
  return {
    id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    visits: customer.visits,
    spent: customer.spent,
    points: customer.points,
    favorite: customer.favorite,
    segment: segmentToUi[customer.segment] ?? "New",
    lastVisit: customer.lastVisit,
  };
}

export function mapEmployee(id: string, employee: EmployeeDoc): Employee {
  return {
    id,
    name: employee.name,
    role: employee.role,
    shift: employee.shift,
    status: employeeStatusToUi[employee.status] ?? "Scheduled",
    avatar:
      employee.avatar ||
      employee.name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    hours: employee.hours,
    hourlyRate: employee.hourlyRate ?? 0,
  };
}

export function mapActivity(id: string, activity: ActivityDoc): Activity {
  return {
    id,
    title: activity.title,
    detail: activity.detail,
    time: formatRelativeTime(activity.createdAt),
    tone: toneToUi[activity.tone],
  };
}

export function mapRecipe(doc: RecipeDoc): Recipe {
  return {
    productId: doc.productId,
    lines: doc.lines ?? [],
    notes: doc.notes || undefined,
  };
}

export function mapModifierGroup(id: string, doc: ModifierGroupDoc): ModifierGroup {
  return {
    id,
    name: doc.name,
    single: Boolean(doc.single),
    options: doc.options ?? [],
    appliesTo: doc.appliesTo ?? [],
  };
}

export function mapSettings(doc?: SettingsDoc | null): CafeSettings {
  if (!doc) return { ...DEFAULT_SETTINGS, categories: [...DEFAULT_SETTINGS.categories] };
  return {
    currency: doc.currency || DEFAULT_SETTINGS.currency,
    timezone: doc.timezone || DEFAULT_SETTINGS.timezone,
    taxRate: Number.isFinite(doc.taxRate) ? doc.taxRate : DEFAULT_SETTINGS.taxRate,
    serviceChargeRate: Number.isFinite(doc.serviceChargeRate)
      ? doc.serviceChargeRate
      : DEFAULT_SETTINGS.serviceChargeRate,
    categories: Array.isArray(doc.categories) && doc.categories.length
      ? doc.categories
      : [...DEFAULT_SETTINGS.categories],
    notifyLowStock: doc.notifyLowStock !== false,
    notifyRefunds: doc.notifyRefunds !== false,
    notifyLate: doc.notifyLate !== false,
    notifyDaily: doc.notifyDaily !== false,
    integrationWhatsapp: Boolean(doc.integrationWhatsapp),
    integrationStripe: Boolean(doc.integrationStripe),
    integrationPickme: Boolean(doc.integrationPickme),
    integrationXero: Boolean(doc.integrationXero),
    tipPresets: Array.isArray(doc.tipPresets) && doc.tipPresets.length ? doc.tipPresets : DEFAULT_SETTINGS.tipPresets,
  };
}

export function mapLedger(id: string, doc: LedgerDoc): StockLedgerEntry {
  return {
    id,
    stockId: doc.stockId,
    stockName: doc.stockName,
    delta: doc.delta,
    reason: doc.reason,
    note: doc.note || "",
    createdAt: doc.createdAt,
  };
}

export function mapWaste(id: string, doc: WasteDoc): WasteRecord {
  return {
    id,
    stockId: doc.stockId,
    stockName: doc.stockName,
    quantity: doc.quantity,
    reason: doc.reason,
    createdAt: doc.createdAt,
  };
}

export function mapPurchaseOrder(id: string, doc: PurchaseOrderDoc): PurchaseOrder {
  return {
    id,
    supplier: doc.supplier,
    status: poStatusToUi[doc.status] ?? "Draft",
    lines: doc.lines ?? [],
    total: doc.total,
    createdAt: doc.createdAt,
  };
}

export function mapFeedback(id: string, doc: FeedbackDoc): Feedback {
  return {
    id,
    customerName: doc.customerName,
    rating: doc.rating,
    comment: doc.comment,
    createdAt: doc.createdAt,
  };
}

export function mapCampaign(id: string, doc: CampaignDoc): Campaign {
  return {
    id,
    title: doc.title,
    audience: doc.audience,
    offer: doc.offer,
    status: campaignStatusToUi[doc.status] ?? "Draft",
    createdAt: doc.createdAt,
  };
}

export function toDbOrderType(type: Order["type"]): OrderTypeDb {
  return orderTypeFromUi[type];
}

export function toDbSegment(segment: Customer["segment"]): CustomerSegmentDb {
  return segmentFromUi[segment];
}

export function toDbEmployeeStatus(status: Employee["status"]): EmployeeStatusDb {
  return employeeStatusFromUi[status];
}

export function toDbPoStatus(status: PurchaseOrder["status"]): PurchaseOrderStatusDb {
  return poStatusFromUi[status];
}

export function toDbCampaignStatus(status: Campaign["status"]): CampaignStatusDb {
  return campaignStatusFromUi[status];
}

export function nextOrderStatus(status: OrderStatusDb): OrderStatusDb {
  if (status === "REFUNDED" || status === "COMPLETED") return status;
  const flow: OrderStatusDb[] = ["RECEIVED", "PREPARING", "READY", "COMPLETED"];
  const index = flow.indexOf(status);
  return flow[Math.min(Math.max(index, 0) + 1, flow.length - 1)];
}

export function toDbActivityTone(tone: Activity["tone"]): ActivityToneDb {
  return toneFromUi[tone];
}

export function nowIso() {
  return new Date().toISOString();
}

export function inferSegment(visits: number, spent: number): CustomerSegmentDb {
  if (spent >= 25000 || visits >= 20) return "VIP";
  if (visits <= 1) return "NEW";
  if (visits >= 2 && spent > 0) return "REGULAR";
  return "AT_RISK";
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "ST";
}
