"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Bell,
  Boxes,
  ChevronDown,
  CircleHelp,
  Coffee,
  Menu,
  PackageOpen,
  PanelLeftClose,
  PanelLeftOpen,
  ReceiptText,
  Search,
  Settings,
  ShoppingBag,
  Users,
  X,
} from "lucide-react";
import Overview from "@/components/modules/overview";
import { InventoryModule, MenuModule, OrdersModule, PosModule } from "@/components/modules/operations";
import { CustomersModule, ReportsModule, SettingsModule, TeamModule } from "@/components/modules/management";
import { Modal, Toast } from "@/components/ui/prototype-ui";
import { useApp } from "./app-provider";
import type { ModuleId } from "@/lib/types";

const navigation: { id: ModuleId; label: string; icon: typeof Coffee }[] = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "pos", label: "Point of sale", icon: ShoppingBag },
  { id: "orders", label: "Orders & KDS", icon: ReceiptText },
  { id: "menu", label: "Menu & recipes", icon: Coffee },
  { id: "inventory", label: "Inventory", icon: Boxes },
  { id: "customers", label: "Customers", icon: Users },
  { id: "team", label: "Team", icon: PackageOpen },
  { id: "reports", label: "Reports", icon: BarChart3 },
];

function branchInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "MC";
}

export default function CafeApp() {
  const { tenant, branch, orders, stock, products, customers, hydrated, error } = useApp();
  const [active, setActive] = useState<ModuleId>("overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);

  const openOrders = orders.filter((order) => order.status !== "Completed" && order.status !== "Refunded").length;
  const lowStock = stock.filter((item) => item.quantity < item.minimum).length;

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function navigate(id: string) {
    setActive(id as ModuleId);
    setMobileOpen(false);
    setSearchOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const searchHits = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return [
      ...products.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 5).map((p) => ({ id: p.id, label: p.name, meta: "Product", module: "menu" as ModuleId })),
      ...orders.filter((o) => o.number.toLowerCase().includes(q) || o.customer.toLowerCase().includes(q)).slice(0, 5).map((o) => ({ id: o.id, label: o.number, meta: o.customer, module: "orders" as ModuleId })),
      ...customers.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 5).map((c) => ({ id: c.id, label: c.name, meta: "Customer", module: "customers" as ModuleId })),
      ...stock.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 5).map((s) => ({ id: s.id, label: s.name, meta: "Stock", module: "inventory" as ModuleId })),
    ].slice(0, 12);
  }, [customers, orders, products, searchQuery, stock]);

  const activeModule = {
    overview: <Overview navigate={navigate} />,
    pos: <PosModule toast={setToast} />,
    orders: <OrdersModule toast={setToast} />,
    menu: <MenuModule toast={setToast} />,
    inventory: <InventoryModule toast={setToast} />,
    customers: <CustomersModule toast={setToast} />,
    team: <TeamModule toast={setToast} />,
    reports: <ReportsModule toast={setToast} />,
    settings: <SettingsModule toast={setToast} />,
  }[active];

  return (
    <div className={`prototype-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      {mobileOpen && <button className="mobile-scrim" aria-label="Close menu" onClick={() => setMobileOpen(false)} />}
      <aside className={`prototype-sidebar ${mobileOpen ? "mobile-open" : ""}`}>
        <div className="prototype-brand">
          <button
            className="brand-mark-btn"
            onClick={() => collapsed && setCollapsed(false)}
            aria-label={collapsed ? "Expand sidebar" : "CaféOS"}
            type="button"
          >
            <Coffee size={19} />
          </button>
          <strong>CaféOS</strong>
          <button
            className="sidebar-toggle"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            type="button"
          >
            {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>
        </div>
        <button className="branch-select" type="button" title={`${tenant.name || "My Café"} · ${branch.location || branch.name}`} onClick={() => navigate("settings")}>
          <span>{branchInitials(tenant.name)}</span>
          <div>
            <strong>{tenant.name || "My Café"}</strong>
            <small>{branch.location || branch.name}</small>
          </div>
          <ChevronDown size={15} />
        </button>
        <div className="sidebar-scroll">
          <p className="side-label">Workspace</p>
          <nav>
            {navigation.map((item) => {
              const Icon = item.icon;
              const badge = item.id === "orders" && openOrders > 0
                ? String(openOrders)
                : item.id === "inventory" && lowStock > 0
                  ? String(lowStock)
                  : null;
              return (
                <button title={item.label} className={active === item.id ? "active" : ""} key={item.id} onClick={() => navigate(item.id)} type="button">
                  <Icon size={17} /><span>{item.label}</span>{badge && <i>{badge}</i>}
                </button>
              );
            })}
          </nav>
          <div className="side-bottom">
            <p className="side-label">Manage</p>
            <button className={active === "settings" ? "active" : ""} onClick={() => navigate("settings")} type="button"><Settings size={17} /><span>Settings</span></button>
            <button onClick={() => setHelpOpen(true)} type="button"><CircleHelp size={17} /><span>Help centre</span></button>
          </div>
        </div>
      </aside>

      <div className="prototype-main">
        <header className="prototype-topbar">
          <button className="mobile-trigger" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu size={19} /></button>
          <button className="global-search" onClick={() => setSearchOpen(true)}><Search size={16} /><span>Search orders, products, customers…</span><kbd>Ctrl K</kbd></button>
          <div className="topbar-actions">
            <button className="top-icon" aria-label="Notifications" onClick={() => setNotificationsOpen(!notificationsOpen)}>
              <Bell size={17} />
              {lowStock > 0 && <i />}
            </button>
            <button className="btn btn-primary" onClick={() => navigate("pos")}>New order</button>
          </div>
          {notificationsOpen && (
            <div className="notification-popover">
              <header><strong>Notifications</strong><button onClick={() => setNotificationsOpen(false)}><X size={15} /></button></header>
              {lowStock > 0 ? (
                <div>
                  <span className="red">!</span>
                  <p><b>{lowStock} low-stock item{lowStock === 1 ? "" : "s"}</b><small>Review inventory levels</small></p>
                </div>
              ) : (
                <div>
                  <span className="green">✓</span>
                  <p><b>No alerts right now</b><small>Stock and orders look clear</small></p>
                </div>
              )}
              <button onClick={() => { navigate("inventory"); setNotificationsOpen(false); }}>View inventory</button>
            </div>
          )}
        </header>
        <main className="prototype-content">
          {!hydrated && <div className="placeholder-panel panel"><h2>Loading CaféOS…</h2><p>Connecting to your café data.</p></div>}
          {hydrated && error && (
            <div className="placeholder-panel panel">
              <h2>Backend unavailable</h2>
              <p>{error}</p>
              <p>Check your data backend, then run <code>npm run db:seed</code> if needed.</p>
            </div>
          )}
          {hydrated && !error && activeModule}
        </main>
      </div>

      {searchOpen && (
        <div className="command-backdrop" onMouseDown={() => { setSearchOpen(false); setSearchQuery(""); }}>
          <div className="command-panel" onMouseDown={(e) => e.stopPropagation()}>
            <label><Search size={18} /><input autoFocus value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search CaféOS…" /></label>
            {searchQuery.trim() ? (
              <>
                <p>Results</p>
                {searchHits.length === 0 ? <button type="button" disabled>No matches</button> : searchHits.map((hit) => (
                  <button key={`${hit.module}-${hit.id}`} onClick={() => navigate(hit.module)}>
                    <span>{hit.label}</span><small>{hit.meta}</small>
                  </button>
                ))}
              </>
            ) : (
              <>
                <p>Quick navigation</p>
                {navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button key={item.id} onClick={() => navigate(item.id)}>
                      <Icon size={16} /><span>{item.label}</span><small>Open</small>
                    </button>
                  );
                })}
              </>
            )}
            <footer><span>↑↓ Navigate</span><span>Enter Select</span><span>Esc Close</span></footer>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onClose={() => setToast("")} />}

      <Modal open={helpOpen} onClose={() => setHelpOpen(false)} title="Help centre" wide>
        <div className="help-centre-copy">
          <h3>Add a product</h3>
          <p>Open <strong>Menu & recipes</strong>, choose <strong>Add product</strong>, set category, price, and optional modifier groups. Link recipes under the Recipes tab so sales deduct stock.</p>
          <h3>Take an order</h3>
          <p>Use <strong>Point of sale</strong> to pick items, attach a customer for loyalty, apply discounts or tips, then charge via card, cash, QR, or split payment.</p>
          <h3>Manage inventory</h3>
          <p>In <strong>Inventory</strong>, add stock with unit cost, record waste, create purchase orders, and run counts when shelves change.</p>
          <button type="button" className="btn btn-primary" onClick={() => { setHelpOpen(false); navigate("settings"); }}>Open settings</button>
        </div>
      </Modal>
    </div>
  );
}
