"use client";

import { useState } from "react";
import { Check, ChevronRight, Clock3, CreditCard, Minus, PackageCheck, Plus, Search, ShoppingCart, SlidersHorizontal, Trash2, UtensilsCrossed } from "lucide-react";
import { usePrototype } from "@/components/prototype/prototype-provider";
import { Modal, SectionHeader, StatusBadge } from "@/components/ui/prototype-ui";
import type { CartItem, Order, Product } from "@/lib/types";

type ToastFn = (message: string) => void;

export function PosModule({ toast }: { toast: ToastFn }) {
  const { products, createOrder } = usePrototype();
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([
    { id: "demo-1", productId: "p1", name: "Iced Latte", price: 1100, quantity: 1, modifiers: ["Large", "Oat milk", "Extra shot"] },
  ]);
  const [selected, setSelected] = useState<Product | null>(null);
  const [modifiers, setModifiers] = useState<string[]>([]);
  const [paying, setPaying] = useState(false);
  const [orderType, setOrderType] = useState<Order["type"]>("Dine in");
  const [receipt, setReceipt] = useState<string | null>(null);
  const categories = ["All", ...new Set(products.map((product) => product.category))];
  const filtered = products.filter((product) => (category === "All" || product.category === category) && product.name.toLowerCase().includes(query.toLowerCase()));
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = Math.round(subtotal * 0.025);
  const total = subtotal + tax;

  function openProduct(product: Product) {
    if (!product.available) return;
    setSelected(product);
    setModifiers([]);
  }

  function addSelected() {
    if (!selected) return;
    const modifierPrice = modifiers.reduce((sum, item) => sum + (item === "Large" ? 100 : item === "Extra shot" ? 150 : item.includes("milk") ? 100 : 0), 0);
    setCart((current) => [...current, { id: `${selected.id}-${Date.now()}`, productId: selected.id, name: selected.name, price: selected.price + modifierPrice, quantity: 1, modifiers }]);
    setSelected(null);
    toast(`${selected.name} added to order`);
  }

  function updateQuantity(id: string, delta: number) {
    setCart((current) => current.map((item) => item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item).filter((item) => item.quantity > 0));
  }

  function completePayment(method: string) {
    const order = createOrder(cart, orderType, "Walk-in");
    setReceipt(order.number);
    setPaying(false);
    setCart([]);
    toast(`${method} payment approved · ${order.number}`);
  }

  return (
    <div className="module-page pos-page">
      <SectionHeader title="Point of sale" description="Colombo 07 · Register 01" actions={<div className="segmented">{(["Dine in", "Pickup", "Delivery"] as Order["type"][]).map((type) => <button className={orderType === type ? "active" : ""} key={type} onClick={() => setOrderType(type)}>{type}</button>)}</div>} />
      <div className="pos-layout">
        <section className="pos-catalog panel">
          <div className="catalog-tools"><label className="field-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search menu…" /></label><button className="square-btn"><SlidersHorizontal size={17} /></button></div>
          <div className="category-tabs">{categories.map((item) => <button className={category === item ? "active" : ""} key={item} onClick={() => setCategory(item)}>{item}</button>)}</div>
          <div className="product-grid">
            {filtered.map((product) => <button className={`product-tile ${!product.available ? "sold-out" : ""}`} key={product.id} onClick={() => openProduct(product)}>
              {product.popular && <span className="popular-tag">Popular</span>}<span className="product-emoji">{product.emoji}</span><strong>{product.name}</strong><small>{product.category}</small><b>LKR {product.price.toLocaleString()}</b>{!product.available && <i>Sold out</i>}
            </button>)}
          </div>
        </section>
        <aside className="cart-panel panel">
          <div className="cart-head"><div><ShoppingCart size={18} /><h2>Current order</h2></div><button onClick={() => setCart([])}>Clear</button></div>
          <div className="order-customer"><span>W</span><div><strong>Walk-in customer</strong><small>Add customer or loyalty</small></div><ChevronRight size={16} /></div>
          <div className="cart-items">
            {cart.length === 0 ? <div className="empty-cart"><ShoppingCart size={28} /><strong>Your order is empty</strong><span>Select an item from the menu</span></div> : cart.map((item) => <div className="cart-item" key={item.id}><div className="cart-copy"><strong>{item.name}</strong><span>{item.modifiers.join(" · ") || "Standard"}</span><b>LKR {(item.price * item.quantity).toLocaleString()}</b></div><div className="quantity-control"><button onClick={() => updateQuantity(item.id, -1)}>{item.quantity === 1 ? <Trash2 size={13} /> : <Minus size={13} />}</button><span>{item.quantity}</span><button onClick={() => updateQuantity(item.id, 1)}><Plus size={13} /></button></div></div>)}
          </div>
          <div className="cart-summary"><div><span>Subtotal</span><b>LKR {subtotal.toLocaleString()}</b></div><div><span>Service charge</span><b>LKR {tax.toLocaleString()}</b></div><div className="cart-total"><span>Total</span><strong>LKR {total.toLocaleString()}</strong></div><button className="btn btn-primary checkout-btn" disabled={!cart.length} onClick={() => setPaying(true)}>Charge LKR {total.toLocaleString()}<ChevronRight size={17} /></button></div>
        </aside>
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Customize ${selected?.name ?? ""}`}>
        <div className="modifier-form">
          <ModifierGroup title="Size" options={["Small", "Medium", "Large"]} selected={modifiers} setSelected={setModifiers} single />
          <ModifierGroup title="Milk" options={["Full cream milk", "Oat milk", "Soy milk", "Almond milk"]} selected={modifiers} setSelected={setModifiers} single />
          <ModifierGroup title="Extras" options={["Extra shot", "Vanilla syrup", "Caramel syrup"]} selected={modifiers} setSelected={setModifiers} />
          <button className="btn btn-primary btn-full" onClick={addSelected}>Add to order · LKR {((selected?.price ?? 0) + modifiers.reduce((sum, item) => sum + (item === "Large" ? 100 : item === "Extra shot" ? 150 : item.includes("milk") ? 100 : 0), 0)).toLocaleString()}</button>
        </div>
      </Modal>

      <Modal open={paying} onClose={() => setPaying(false)} title="Take payment">
        <div className="payment-total"><span>Amount due</span><strong>LKR {total.toLocaleString()}</strong></div>
        <div className="payment-grid"><button onClick={() => completePayment("Card")}><CreditCard /><strong>Card</strong><span>Tap or insert</span></button><button onClick={() => completePayment("Cash")}><span className="payment-glyph">රු</span><strong>Cash</strong><span>Open drawer</span></button><button onClick={() => completePayment("QR")}><span className="payment-glyph">▦</span><strong>QR pay</strong><span>Scan code</span></button><button onClick={() => completePayment("Split")}><span className="payment-glyph">◫</span><strong>Split</strong><span>Multiple methods</span></button></div>
      </Modal>

      <Modal open={!!receipt} onClose={() => setReceipt(null)} title="Payment complete">
        <div className="receipt-success"><span><Check size={28} /></span><h3>Order {receipt} confirmed</h3><p>The order was sent to the bar. A demo receipt has been generated.</p><button className="btn btn-primary btn-full" onClick={() => setReceipt(null)}>Start next order</button></div>
      </Modal>
    </div>
  );
}

function ModifierGroup({ title, options, selected, setSelected, single = false }: { title: string; options: string[]; selected: string[]; setSelected: (items: string[]) => void; single?: boolean }) {
  const toggle = (option: string) => {
    if (single) {
      const withoutGroup = selected.filter((item) => !options.includes(item));
      setSelected(selected.includes(option) ? withoutGroup : [...withoutGroup, option]);
    } else setSelected(selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option]);
  };
  return <div className="modifier-group"><h3>{title}</h3><div>{options.map((option) => <button className={selected.includes(option) ? "active" : ""} key={option} onClick={() => toggle(option)}>{option}{selected.includes(option) && <Check size={14} />}</button>)}</div></div>;
}

export function OrdersModule({ toast }: { toast: ToastFn }) {
  const { orders, advanceOrder } = usePrototype();
  const [view, setView] = useState<"list" | "kds">("kds");
  const [filter, setFilter] = useState("All");
  const shown = orders.filter((order) => filter === "All" || order.status === filter);
  const nextLabel: Record<string, string> = { Received: "Start", Preparing: "Mark ready", Ready: "Complete", Completed: "Completed" };

  function advance(id: string, number: string) {
    advanceOrder(id);
    toast(`${number} status updated`);
  }

  return <div className="module-page">
    <SectionHeader title="Orders" description={`${orders.filter((order) => order.status !== "Completed").length} active orders across all channels`} actions={<div className="segmented"><button className={view === "kds" ? "active" : ""} onClick={() => setView("kds")}>KDS board</button><button className={view === "list" ? "active" : ""} onClick={() => setView("list")}>Order list</button></div>} />
    <div className="filter-row">{["All", "Received", "Preparing", "Ready", "Completed"].map((status) => <button className={filter === status ? "active" : ""} key={status} onClick={() => setFilter(status)}>{status}<span>{status === "All" ? orders.length : orders.filter((order) => order.status === status).length}</span></button>)}</div>
    {view === "kds" ? <div className="kds-board">{["Received", "Preparing", "Ready"].map((status) => <section className="kds-column" key={status}><div className="kds-head"><div><i className={`kds-dot ${status.toLowerCase()}`} /><strong>{status}</strong></div><span>{orders.filter((order) => order.status === status).length}</span></div>{orders.filter((order) => order.status === status).map((order) => <article className="kds-ticket" key={order.id}><div><strong>{order.number}</strong><StatusBadge tone={order.type}>{order.type}</StatusBadge></div><h3>{order.customer}</h3><p>{order.items} items · {order.items > 2 ? "Iced Latte, Croissant + more" : "Cappuccino, Iced Latte"}</p><footer><span><Clock3 size={13} />{order.placedAt}</span><button onClick={() => advance(order.id, order.number)}>{nextLabel[order.status]}<ChevronRight size={14} /></button></footer></article>)}</section>)}</div> :
      <div className="data-table panel"><div className="table-head"><span>Order</span><span>Customer</span><span>Channel</span><span>Items</span><span>Total</span><span>Status</span><span /></div>{shown.map((order) => <div className="table-row" key={order.id}><strong>{order.number}</strong><span>{order.customer}</span><span>{order.type}</span><span>{order.items}</span><b>LKR {order.total.toLocaleString()}</b><StatusBadge tone={order.status}>{order.status}</StatusBadge><button disabled={order.status === "Completed"} onClick={() => advance(order.id, order.number)}>{nextLabel[order.status]}</button></div>)}</div>}
  </div>;
}

export function MenuModule({ toast }: { toast: ToastFn }) {
  const { products, toggleProduct } = usePrototype();
  const [tab, setTab] = useState("Products");
  return <div className="module-page">
    <SectionHeader title="Menu & recipes" description={`${products.length} products · ${products.filter((p) => p.available).length} available`} actions={<button className="btn btn-primary" onClick={() => toast("Product editor opened in demo mode")}><Plus size={15} />Add product</button>} />
    <div className="module-tabs">{["Products", "Categories", "Modifiers", "Recipes", "Profitability"].map((item) => <button className={tab === item ? "active" : ""} onClick={() => setTab(item)} key={item}>{item}</button>)}</div>
    {tab === "Products" && <div className="data-table menu-table panel"><div className="table-head"><span>Product</span><span>Category</span><span>Price</span><span>Cost</span><span>Margin</span><span>Available</span></div>{products.map((product) => <div className="table-row" key={product.id}><div className="name-cell"><span>{product.emoji}</span><div><strong>{product.name}</strong><small>{product.popular ? "Popular item" : "Standard item"}</small></div></div><span>{product.category}</span><b>LKR {product.price.toLocaleString()}</b><span>LKR {product.cost.toLocaleString()}</span><strong className={(1 - product.cost / product.price) > .6 ? "success-text" : "warning-text"}>{Math.round((1 - product.cost / product.price) * 100)}%</strong><button className={`toggle ${product.available ? "on" : ""}`} onClick={() => toggleProduct(product.id)}><i /></button></div>)}</div>}
    {tab === "Recipes" && <div className="recipe-layout"><div className="panel recipe-list">{products.slice(0, 7).map((product, index) => <button className={index === 0 ? "active" : ""} key={product.id}><span>{product.emoji}</span><div><strong>{product.name}</strong><small>{index % 2 ? "4 ingredients" : "5 ingredients"}</small></div><ChevronRight size={15} /></button>)}</div><RecipeDetail /></div>}
    {tab === "Profitability" && <Profitability products={products} />}
    {tab !== "Products" && tab !== "Recipes" && tab !== "Profitability" && <div className="placeholder-panel panel"><UtensilsCrossed size={28} /><h2>{tab}</h2><p>Configure your {tab.toLowerCase()} using this interactive prototype workspace.</p><button className="btn btn-secondary" onClick={() => toast(`${tab} editor opened`)}>Open {tab.toLowerCase()} editor</button></div>}
  </div>;
}

function RecipeDetail() {
  const ingredients = [["Coffee beans", "18 g", "LKR 144"], ["Fresh milk", "200 ml", "LKR 110"], ["Ice", "150 g", "LKR 8"], ["12oz cup", "1 pc", "LKR 14"], ["Cup lid", "1 pc", "LKR 4"]];
  return <article className="panel recipe-detail"><div className="panel-head"><div><p>Recipe</p><h2>Iced Latte</h2></div><StatusBadge tone="healthy">67.1% margin</StatusBadge></div><div className="recipe-stats"><div><span>Selling price</span><strong>LKR 850</strong></div><div><span>Recipe cost</span><strong>LKR 280</strong></div><div><span>Gross profit</span><strong>LKR 570</strong></div></div><div className="recipe-lines"><header><span>Ingredient</span><span>Quantity</span><span>Cost</span></header>{ingredients.map((item) => <div key={item[0]}><strong>{item[0]}</strong><span>{item[1]}</span><b>{item[2]}</b></div>)}</div><div className="cost-alert"><span>↗</span><div><strong>Bean price changed by 8%</strong><p>This recipe now costs LKR 11 more per serving.</p></div></div></article>;
}

function Profitability({ products }: { products: Product[] }) {
  return <div className="profit-grid">{products.slice(0, 8).map((product) => { const margin = Math.round((1 - product.cost / product.price) * 100); return <article className="panel profit-card" key={product.id}><span>{product.emoji}</span><div><strong>{product.name}</strong><small>{product.category}</small></div><div className="margin-ring" style={{ "--margin": `${margin * 3.6}deg` } as React.CSSProperties}><b>{margin}%</b></div><footer><span>Profit / item</span><strong>LKR {(product.price - product.cost).toLocaleString()}</strong></footer></article>; })}</div>;
}

export function InventoryModule({ toast }: { toast: ToastFn }) {
  const { stock, adjustStock, addActivity } = usePrototype();
  const [tab, setTab] = useState("Stock");
  const [adjusting, setAdjusting] = useState<string | null>(null);
  const item = stock.find((entry) => entry.id === adjusting);
  const inventoryValue = stock.reduce((sum, entry) => sum + entry.value, 0);
  function receivePo() {
    adjustStock("s1", 20);
    adjustStock("s2", 10);
    addActivity({ title: "Purchase order received", detail: "PO-0028 · Serendib Roasters", tone: "blue" });
    toast("PO-0028 received and stock updated");
  }
  return <div className="module-page">
    <SectionHeader title="Inventory" description="Real-time ingredient and packaging stock" actions={<><button className="btn btn-secondary" onClick={() => toast("Stock count started for 7 items")}><PackageCheck size={15} />Start count</button><button className="btn btn-primary" onClick={() => setTab("Purchase orders")}><Plus size={15} />Purchase order</button></>} />
    <div className="metric-grid mini"><article className="metric-card plain"><p>Inventory value</p><strong>LKR {inventoryValue.toLocaleString()}</strong><small>Across 7 tracked items</small></article><article className="metric-card plain"><p>Low stock</p><strong>{stock.filter((i) => i.quantity < i.minimum).length}</strong><small className="danger-text">Action recommended</small></article><article className="metric-card plain"><p>Waste this month</p><strong>LKR 18,450</strong><small className="success-text">12% below last month</small></article><article className="metric-card plain"><p>Open POs</p><strong>3</strong><small>LKR 124,600 incoming</small></article></div>
    <div className="module-tabs">{["Stock", "Purchase orders", "Suppliers", "Waste", "Stock ledger"].map((value) => <button className={tab === value ? "active" : ""} key={value} onClick={() => setTab(value)}>{value}</button>)}</div>
    {tab === "Stock" && <div className="data-table inventory-table panel"><div className="table-head"><span>Ingredient</span><span>On hand</span><span>Minimum</span><span>Supplier</span><span>Cost trend</span><span>Status</span><span /></div>{stock.map((entry) => { const low = entry.quantity < entry.minimum; return <div className="table-row" key={entry.id}><div className="name-cell"><span className={low ? "stock-icon low" : "stock-icon"}>{entry.name[0]}</span><div><strong>{entry.name}</strong><small>{entry.category}</small></div></div><strong>{entry.quantity} {entry.unit}</strong><span>{entry.minimum} {entry.unit}</span><span>{entry.supplier}</span><b className={entry.trend > 4 ? "danger-text" : ""}>{entry.trend > 0 ? "↗" : entry.trend < 0 ? "↘" : "—"} {Math.abs(entry.trend)}%</b><StatusBadge tone={low ? "low" : "healthy"}>{low ? "Low stock" : "Healthy"}</StatusBadge><button onClick={() => setAdjusting(entry.id)}>Adjust</button></div>})}</div>}
    {tab === "Purchase orders" && <div className="po-grid"><article className="panel po-card"><header><div><strong>PO-0028</strong><StatusBadge tone="received">Delivered</StatusBadge></div><span>Serendib Roasters</span></header><div><p>Arabica beans · 10 kg</p><p>Fresh milk · 20 L</p></div><footer><div><span>Total</span><strong>LKR 93,500</strong></div><button className="btn btn-primary" onClick={receivePo}>Receive goods</button></footer></article><article className="panel po-card"><header><div><strong>PO-0029</strong><StatusBadge tone="preparing">In transit</StatusBadge></div><span>PackRight Lanka</span></header><div><p>12oz cups · 1,000 pcs</p><p>Cup lids · 1,000 pcs</p></div><footer><div><span>Total</span><strong>LKR 42,800</strong></div><button className="btn btn-secondary" onClick={() => toast("Tracking link opened")}>Track shipment</button></footer></article></div>}
    {tab !== "Stock" && tab !== "Purchase orders" && <div className="placeholder-panel panel"><PackageCheck size={28} /><h2>{tab}</h2><p>Demo records and controls for {tab.toLowerCase()} are ready for presentation.</p><button className="btn btn-secondary" onClick={() => toast(`${tab} action completed`)}>Run demo action</button></div>}
    <Modal open={!!adjusting} onClose={() => setAdjusting(null)} title={`Adjust ${item?.name ?? "stock"}`}><div className="adjust-modal"><p>Current stock</p><strong>{item?.quantity} {item?.unit}</strong><div><button onClick={() => item && adjustStock(item.id, -1)}><Minus />Remove 1</button><button onClick={() => item && adjustStock(item.id, 1)}><Plus />Add 1</button><button onClick={() => item && adjustStock(item.id, 10)}><Plus />Add 10</button></div><button className="btn btn-primary btn-full" onClick={() => { setAdjusting(null); toast("Stock adjustment saved"); }}>Save adjustment</button></div></Modal>
  </div>;
}
