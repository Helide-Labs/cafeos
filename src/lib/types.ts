export type ModuleId =
  | "overview"
  | "pos"
  | "orders"
  | "menu"
  | "inventory"
  | "customers"
  | "team"
  | "reports"
  | "ai"
  | "settings";

export type OrderStatus = "Received" | "Preparing" | "Ready" | "Completed";

export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  emoji: string;
  available: boolean;
  popular?: boolean;
};

export type CartItem = {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  modifiers: string[];
};

export type Order = {
  id: string;
  number: string;
  customer: string;
  type: "Dine in" | "Pickup" | "Delivery";
  status: OrderStatus;
  total: number;
  items: number;
  placedAt: string;
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
};

export type Activity = {
  id: string;
  title: string;
  detail: string;
  time: string;
  tone: "green" | "amber" | "blue" | "red";
};

export type PrototypeState = {
  products: Product[];
  orders: Order[];
  stock: StockItem[];
  customers: Customer[];
  employees: Employee[];
  activities: Activity[];
};
