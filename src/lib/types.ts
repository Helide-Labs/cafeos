export type ModuleId =
  | "overview"
  | "pos"
  | "orders"
  | "menu"
  | "inventory"
  | "customers"
  | "team"
  | "reports"
  | "settings";

export type OrderStatus = "Received" | "Preparing" | "Ready" | "Completed" | "Refunded";

export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  emoji: string;
  imageUrl?: string;
  description?: string;
  available: boolean;
  popular?: boolean;
  modifierGroupIds?: string[];
};

export type CartItem = {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  modifiers: string[];
};

export type OrderLine = {
  productId: string | null;
  name: string;
  price: number;
  quantity: number;
  modifiers: string[];
};

export type Order = {
  id: string;
  number: string;
  customer: string;
  customerId?: string;
  type: "Dine in" | "Pickup" | "Delivery";
  status: OrderStatus;
  total: number;
  subtotal: number;
  tax: number;
  serviceCharge: number;
  discount: number;
  tip: number;
  paymentMethod: string;
  amountTendered?: number;
  changeDue?: number;
  items: number;
  lines: OrderLine[];
  placedAt: string;
  placedAtIso: string;
};

export type StockItem = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  minimum: number;
  value: number;
  supplier: string;
  trend: number;
};

export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  visits: number;
  spent: number;
  points: number;
  favorite: string;
  segment: "VIP" | "Regular" | "New" | "At risk";
  lastVisit: string;
};

export type Employee = {
  id: string;
  name: string;
  role: string;
  shift: string;
  status: "Working" | "Scheduled" | "Late" | "Off";
  avatar: string;
  hours: number;
  hourlyRate: number;
};

export type Activity = {
  id: string;
  title: string;
  detail: string;
  time: string;
  tone: "green" | "amber" | "blue" | "red";
};

export type RecipeLine = {
  stockId: string;
  quantity: number;
};

export type Recipe = {
  productId: string;
  lines: RecipeLine[];
  notes?: string;
};

export type ModifierOption = {
  name: string;
  price: number;
};

export type ModifierGroup = {
  id: string;
  name: string;
  single: boolean;
  options: ModifierOption[];
  appliesTo: string[];
};

export type CafeSettings = {
  currency: string;
  timezone: string;
  taxRate: number;
  serviceChargeRate: number;
  categories: string[];
  notifyLowStock: boolean;
  notifyRefunds: boolean;
  notifyLate: boolean;
  notifyDaily: boolean;
  integrationWhatsapp?: boolean;
  integrationStripe?: boolean;
  integrationPickme?: boolean;
  integrationXero?: boolean;
  tipPresets?: number[];
};

export type StockLedgerEntry = {
  id: string;
  stockId: string;
  stockName: string;
  delta: number;
  reason: "sale" | "adjust" | "waste" | "count" | "receive" | "po";
  note: string;
  createdAt: string;
};

export type WasteRecord = {
  id: string;
  stockId: string;
  stockName: string;
  quantity: number;
  reason: string;
  createdAt: string;
};

export type PurchaseOrderLine = {
  stockId: string;
  name: string;
  quantity: number;
  unitCost: number;
};

export type PurchaseOrder = {
  id: string;
  supplier: string;
  status: "Draft" | "Ordered" | "Received";
  lines: PurchaseOrderLine[];
  total: number;
  createdAt: string;
};

export type Feedback = {
  id: string;
  customerName: string;
  rating: number;
  comment: string;
  createdAt: string;
};

export type Campaign = {
  id: string;
  title: string;
  audience: string;
  offer: string;
  status: "Draft" | "Active";
  createdAt: string;
};

export type BranchInfo = {
  id: string;
  name: string;
  location: string;
};

export type TenantInfo = {
  id: string;
  name: string;
};

export type AppState = {
  tenant: TenantInfo;
  branch: BranchInfo;
  products: Product[];
  orders: Order[];
  stock: StockItem[];
  customers: Customer[];
  employees: Employee[];
  activities: Activity[];
  settings: CafeSettings;
  recipes: Recipe[];
  modifierGroups: ModifierGroup[];
  ledger: StockLedgerEntry[];
  waste: WasteRecord[];
  purchaseOrders: PurchaseOrder[];
  feedback: Feedback[];
  campaigns: Campaign[];
};
