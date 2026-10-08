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

export type OrderTypeDb = "DINE_IN" | "PICKUP" | "DELIVERY";
export type OrderStatusDb = "RECEIVED" | "PREPARING" | "READY" | "COMPLETED" | "REFUNDED";
export type CustomerSegmentDb = "VIP" | "REGULAR" | "NEW" | "AT_RISK";
export type EmployeeStatusDb = "WORKING" | "SCHEDULED" | "LATE" | "OFF";
export type ActivityToneDb = "GREEN" | "AMBER" | "BLUE" | "RED";
export type LedgerReasonDb = "sale" | "adjust" | "waste" | "count" | "receive" | "po";
export type PurchaseOrderStatusDb = "DRAFT" | "ORDERED" | "RECEIVED";
export type CampaignStatusDb = "DRAFT" | "ACTIVE";

export type TenantDoc = {
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type BranchDoc = {
  name: string;
  location: string;
  createdAt: string;
  updatedAt: string;
};

export type ProductDoc = {
  name: string;
  category: string;
  price: number;
  cost: number;
  emoji: string;
  imageUrl?: string;
  description?: string;
  available: boolean;
  popular: boolean;
  modifierGroupIds?: string[];
  createdAt: string;
  updatedAt: string;
};

export type OrderItemDoc = {
  productId: string | null;
  name: string;
  price: number;
  quantity: number;
  modifiers: string[];
};

export type OrderDoc = {
  number: number;
  customer: string;
  customerId?: string;
  type: OrderTypeDb;
  status: OrderStatusDb;
  total: number;
  subtotal: number;
  tax: number;
  serviceCharge: number;
  discount: number;
  tip: number;
  paymentMethod: string;
  amountTendered?: number;
  changeDue?: number;
  itemCount: number;
  items: OrderItemDoc[];
  createdAt: string;
  updatedAt: string;
};

export type StockDoc = {
  name: string;
  category: string;
  quantity: number;
  unit: string;
  minimum: number;
  value: number;
  supplier: string;
  trend: number;
  createdAt: string;
  updatedAt: string;
};

export type CustomerDoc = {
  name: string;
  email: string;
  phone: string;
  visits: number;
  spent: number;
  points: number;
  favorite: string;
  segment: CustomerSegmentDb;
  lastVisit: string;
  createdAt: string;
  updatedAt: string;
};

export type EmployeeDoc = {
  name: string;
  role: string;
  shift: string;
  status: EmployeeStatusDb;
  avatar: string;
  hours: number;
  hourlyRate: number;
  createdAt: string;
  updatedAt: string;
};

export type ActivityDoc = {
  title: string;
  detail: string;
  tone: ActivityToneDb;
  createdAt: string;
};

export type RecipeDoc = {
  productId: string;
  lines: { stockId: string; quantity: number }[];
  notes?: string;
  updatedAt: string;
};

export type ModifierGroupDoc = {
  name: string;
  single: boolean;
  options: { name: string; price: number }[];
  appliesTo: string[];
  createdAt: string;
  updatedAt: string;
};

export type SettingsDoc = CafeSettings & {
  updatedAt: string;
};

export type LedgerDoc = {
  stockId: string;
  stockName: string;
  delta: number;
  reason: LedgerReasonDb;
  note: string;
  createdAt: string;
};

export type WasteDoc = {
  stockId: string;
  stockName: string;
  quantity: number;
  reason: string;
  createdAt: string;
};

export type PurchaseOrderDoc = {
  supplier: string;
  status: PurchaseOrderStatusDb;
  lines: { stockId: string; name: string; quantity: number; unitCost: number }[];
  total: number;
  createdAt: string;
  updatedAt: string;
};

export type FeedbackDoc = {
  customerName: string;
  rating: number;
  comment: string;
  createdAt: string;
};

export type CampaignDoc = {
  title: string;
  audience: string;
  offer: string;
  status: CampaignStatusDb;
  createdAt: string;
  updatedAt: string;
};

export type CountersDoc = {
  orderNumber: number;
};

export type {
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
};
