"use client";

import { useEffect, useMemo, useState } from "react";
import { TEAM_ROLES } from "@/lib/defaults";
import { canAccess, readStoredRole, ROLE_PROFILES, storeRole, type AppRole } from "@/lib/roles";
import { RoleProvider } from "./role-context";
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
  const [role, setRole] = useState<AppRole>("Owner");
  const profile = ROLE_PROFILES[role];
  const visibleNav = navigation.filter((item) => canAccess(role, item.id));

  const openOrders = orders.filter((order) => order.status !== "Completed" && order.status !== "Refunded").length;
  const lowStock = stock.filter((item) => item.quantity < item.minimum).length;

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const stored = readStoredRole();
    setRole(stored);
  }, []);

  useEffect(() => {
    if (!canAccess(role, active)) setActive("overview");
  }, [active, role]);

  function selectRole(next: AppRole) {
    setRole(next);
    storeRole(next);
    if (!canAccess(next, active)) setActive("overview");
  }

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
    ].filter((hit) => canAccess(role, hit.module)).slice(0, 12);
  }, [customers, orders, products, role, searchQuery, stock]);

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

  const helpTopics = [
    { title: "Add a product", body: "Open Menu & recipes, choose Add product, set category, price, and optional modifier groups. Link recipes under the Recipes tab so sales deduct stock.", module: "menu" as ModuleId },
    { title: "Take an order", body: "Use Point of sale to pick items, attach a customer for loyalty, apply discounts or tips, then charge via card, cash, QR, or split payment.", module: "pos" as ModuleId },
    { title: "Work the queue", body: "Open Orders & KDS to start tickets, mark them ready, and complete them when they leave the pass.", module: "orders" as ModuleId },
    { title: "Manage inventory", body: "In Inventory, check on-hand levels, record waste, and refill anything below its minimum.", module: "inventory" as ModuleId },
  ].filter((topic) => canAccess(role, topic.module));
  const stockAlerts = canAccess(role, "inventory");
  const alertCount = stockAlerts ? lowStock : openOrders;

  return (
    <RoleProvider role={role}>
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
        <button className="branch-select" type="button" title={`${tenant.name || "My Café"} · ${branch.location || branch.name}`} onClick={() => { if (canAccess(role, "settings")) navigate("settings"); }}>
          <span>{branchInitials(tenant.name)}</span>
          <div>
            <strong>{tenant.name || "My Café"}</strong>
            <small>{branch.location || branch.name}</small>
          </div>
          <ChevronDown size={15} />
        </button>
        <label className="role-switch">
          <span>Role</span>
          <select aria-label="Dashboard role" value={role} onChange={(event) => selectRole(event.target.value as AppRole)}>
            {TEAM_ROLES.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <div className="sidebar-scroll">
          <p className="side-label">Workspace</p>
          <nav>
            {visibleNav.map((item) => {
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
            {canAccess(role, "settings") && <button className={active === "settings" ? "active" : ""} onClick={() => navigate("settings")} type="button"><Settings size={17} /><span>Settings</span></button>}
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
              {alertCount > 0 && <i />}
            </button>
            <button className="btn btn-primary" onClick={() => navigate(profile.primaryAction.module)}>{profile.primaryAction.label}</button>
          </div>
          {notificationsOpen && (
            <div className="notification-popover">
              <header><strong>Notifications</strong><button onClick={() => setNotificationsOpen(false)}><X size={15} /></button></header>
              {stockAlerts && lowStock > 0 ? (
                <div>
                  <span className="red">!</span>
                  <p><b>{lowStock} low-stock item{lowStock === 1 ? "" : "s"}</b><small>Review inventory levels</small></p>
                </div>
              ) : !stockAlerts && openOrders > 0 ? (
                <div>
                  <span className="red">!</span>
                  <p><b>{openOrders} open order{openOrders === 1 ? "" : "s"}</b><small>Waiting on the queue</small></p>
                </div>
              ) : (
                <div>
                  <span className="green">✓</span>
                  <p><b>No alerts right now</b><small>{stockAlerts ? "Stock and orders look clear" : "The queue looks clear"}</small></p>
                </div>
              )}
              <button onClick={() => { navigate(stockAlerts ? "inventory" : "orders"); setNotificationsOpen(false); }}>{stockAlerts ? "View inventory" : "Open orders"}</button>
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
                {visibleNav.map((item) => {
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
          {helpTopics.map((topic) => (
            <div key={topic.title}>
              <h3>{topic.title}</h3>
              <p>{topic.body}</p>
            </div>
          ))}
          <button type="button" className="btn btn-primary" onClick={() => { setHelpOpen(false); navigate(canAccess(role, "settings") ? "settings" : profile.primaryAction.module); }}>
            {canAccess(role, "settings") ? "Open settings" : profile.primaryAction.label}
          </button>
        </div>
      </Modal>
    </div>
    </RoleProvider>
  );
}
