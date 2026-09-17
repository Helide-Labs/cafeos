"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  Bell,
  Bot,
  Boxes,
  ChevronDown,
  CircleHelp,
  Coffee,
  Menu,
  PackageOpen,
  PanelLeftClose,
  ReceiptText,
  RotateCcw,
  Search,
  Settings,
  ShoppingBag,
  Users,
  X,
} from "lucide-react";
import Overview from "@/components/modules/overview";
import { InventoryModule, MenuModule, OrdersModule, PosModule } from "@/components/modules/operations";
import { CustomersModule, ReportsModule, SettingsModule, TeamModule } from "@/components/modules/management";
import AiCentre from "@/components/modules/ai-centre";
import { DemoToast, Modal } from "@/components/ui/prototype-ui";
import { usePrototype } from "./prototype-provider";
import type { ModuleId } from "@/lib/types";

const navigation: { id: ModuleId; label: string; icon: typeof Coffee; badge?: string }[] = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "pos", label: "Point of sale", icon: ShoppingBag },
  { id: "orders", label: "Orders & KDS", icon: ReceiptText, badge: "4" },
  { id: "menu", label: "Menu & recipes", icon: Coffee },
  { id: "inventory", label: "Inventory", icon: Boxes, badge: "2" },
  { id: "customers", label: "Customers", icon: Users },
  { id: "team", label: "Team", icon: PackageOpen },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "ai", label: "AI centre", icon: Bot, badge: "3" },
];

export default function PrototypeApp() {
  const { resetDemo } = usePrototype();
  const [active, setActive] = useState<ModuleId>("overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function navigate(id: string) {
    setActive(id as ModuleId);
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const activeModule = {
    overview: <Overview navigate={navigate} />,
    pos: <PosModule toast={setToast} />,
    orders: <OrdersModule toast={setToast} />,
    menu: <MenuModule toast={setToast} />,
    inventory: <InventoryModule toast={setToast} />,
    customers: <CustomersModule toast={setToast} />,
    team: <TeamModule toast={setToast} />,
    reports: <ReportsModule toast={setToast} />,
    ai: <AiCentre toast={setToast} />,
    settings: <SettingsModule toast={setToast} />,
  }[active];

  return (
    <div className={`prototype-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      {mobileOpen && <button className="mobile-scrim" aria-label="Close menu" onClick={() => setMobileOpen(false)} />}
      <aside className={`prototype-sidebar ${mobileOpen ? "mobile-open" : ""}`}>
        <div className="prototype-brand"><span><Coffee size={19} /></span><strong>CaféOS</strong><button onClick={() => setCollapsed(!collapsed)} aria-label="Collapse sidebar"><PanelLeftClose size={17} /></button></div>
        <button className="branch-select"><span>BC</span><div><strong>Bloom Coffee</strong><small>Colombo 07</small></div><ChevronDown size={15} /></button>
        <p className="side-label">Workspace</p>
        <nav>{navigation.map((item) => { const Icon = item.icon; return <button title={item.label} className={active === item.id ? "active" : ""} key={item.id} onClick={() => navigate(item.id)}><Icon size={17} /><span>{item.label}</span>{item.badge && <i>{item.badge}</i>}</button>; })}</nav>
        <div className="side-bottom">
          <p className="side-label">Manage</p>
          <button className={active === "settings" ? "active" : ""} onClick={() => navigate("settings")}><Settings size={17} /><span>Settings</span></button>
          <button onClick={() => setToast("Help centre opened")}><CircleHelp size={17} /><span>Help centre</span></button>
          <button onClick={() => setResetOpen(true)}><RotateCcw size={17} /><span>Reset demo</span></button>
          <div className="prototype-user"><span>PS</span><div><strong>Pasindu Silva</strong><small>Owner</small></div><ChevronDown size={14} /></div>
        </div>
      </aside>

      <div className="prototype-main">
        <header className="prototype-topbar">
          <button className="mobile-trigger" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu size={19} /></button>
          <button className="global-search" onClick={() => setSearchOpen(true)}><Search size={16} /><span>Search orders, products, customers…</span><kbd>Ctrl K</kbd></button>
          <div className="topbar-actions">
            <span className="demo-mode"><i />Demo mode</span>
            <button className="top-icon" aria-label="Notifications" onClick={() => setNotificationsOpen(!notificationsOpen)}><Bell size={17} /><i /></button>
            <button className="btn btn-primary" onClick={() => navigate("pos")}>New order</button>
          </div>
          {notificationsOpen && <div className="notification-popover"><header><strong>Notifications</strong><button onClick={() => setNotificationsOpen(false)}><X size={15} /></button></header><div><span className="red">!</span><p><b>Fresh milk is low</b><small>Projected to run out tomorrow</small></p></div><div><span className="amber">↗</span><p><b>Bean cost changed</b><small>17 recipes are affected</small></p></div><div><span className="green">✓</span><p><b>Daily target ahead</b><small>Sales are 14.2% above yesterday</small></p></div><button onClick={() => { navigate("inventory"); setNotificationsOpen(false); }}>View notification centre</button></div>}
        </header>
        <main className="prototype-content">{activeModule}</main>
      </div>

      {searchOpen && <div className="command-backdrop" onMouseDown={() => setSearchOpen(false)}><div className="command-panel" onMouseDown={(e) => e.stopPropagation()}><label><Search size={18} /><input autoFocus placeholder="Search CaféOS…" /></label><p>Quick navigation</p>{navigation.slice(0, 7).map((item) => { const Icon = item.icon; return <button key={item.id} onClick={() => { navigate(item.id); setSearchOpen(false); }}><Icon size={16} /><span>{item.label}</span><small>Open</small></button>; })}<footer><span>↑↓ Navigate</span><span>Enter Select</span><span>Esc Close</span></footer></div></div>}

      <Modal open={resetOpen} onClose={() => setResetOpen(false)} title="Reset demo data">
        <div className="reset-dialog"><RotateCcw size={27} /><p>This restores all orders, stock, customers and prototype settings to their original demo values.</p><div><button className="btn btn-secondary" onClick={() => setResetOpen(false)}>Cancel</button><button className="btn btn-danger" onClick={() => { resetDemo(); setResetOpen(false); setToast("Demo data reset"); navigate("overview"); }}>Reset demo</button></div></div>
      </Modal>
      {toast && <DemoToast message={toast} onClose={() => setToast("")} />}
    </div>
  );
}
