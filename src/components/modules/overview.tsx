"use client";

import { ArrowUpRight, ChefHat, Coffee, Package, ShoppingBag, Users } from "lucide-react";
import { useApp } from "@/components/app/app-provider";
import { useAppRole } from "@/components/app/role-context";
import { BarChart, SectionHeader, StatusBadge } from "@/components/ui/prototype-ui";
import { ROLE_PROFILES, type DashboardWidget } from "@/lib/roles";
import type { Order } from "@/lib/types";

const DASHBOARD_COPY = {
  Owner: {
    title: (name: string) => `Welcome to ${name}`,
    description: "Sales, stock, team, and the work happening on the floor.",
  },
  Manager: {
    title: () => "Manager dashboard",
    description: "Today's sales, open orders, stock risks, and who is on shift.",
  },
  Cashier: {
    title: () => "Cashier desk",
    description: "Open tickets, guests, and a shortcut into the next order.",
  },
  Barista: {
    title: () => "Bar queue",
    description: "Drinks to make and ingredients running low.",
  },
  Kitchen: {
    title: () => "Kitchen board",
    description: "Tickets in the pass and stock that needs a refill.",
  },
} as const;

export default function Overview({ navigate }: { navigate: (view: string) => void }) {
  const role = useAppRole();
  const profile = ROLE_PROFILES[role];
  const { orders, stock, customers, activities, employees, tenant, settings } = useApp();
  const currency = settings.currency;
  const salesOrders = orders.filter((order) => order.status !== "Refunded");
  const lowStock = stock.filter((item) => item.quantity < item.minimum);
  const openOrders = orders.filter((order) => order.status !== "Completed" && order.status !== "Refunded");
  const tickets = orders.filter((order) => order.status === "Received" || order.status === "Preparing");
  const working = employees.filter((employee) => employee.status === "Working");
  const netSales = salesOrders.reduce((sum, order) => sum + order.total, 0);
  const chartValues = buildDailyTotals(salesOrders);
  const cafeName = tenant.name || "your café";
  const copy = DASHBOARD_COPY[role];
  const show = (widget: DashboardWidget) => profile.widgets.includes(widget);
  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="module-page">
      <SectionHeader
        eyebrow={todayLabel}
        title={copy.title(cafeName)}
        description={copy.description}
        actions={
          <>
            <span className="live-chip"><i />Live</span>
            <button className="btn btn-primary" onClick={() => navigate(profile.primaryAction.module)}>{profile.primaryAction.label}</button>
          </>
        }
      />

      <div className="metric-grid">
        {show("sales") && <article className="metric-card green"><span><ArrowUpRight size={17} /></span><p>Net sales</p><strong>{currency} {netSales.toLocaleString()}</strong><small>Excludes refunds</small></article>}
        {show("orderCount") && <article className="metric-card sand"><span><ShoppingBag size={17} /></span><p>Orders</p><strong>{salesOrders.length}</strong><small>{openOrders.length} in progress</small></article>}
        {show("ticketQueue") && <article className="metric-card sand"><span>{role === "Kitchen" ? <ChefHat size={17} /> : <Coffee size={17} />}</span><p>To make</p><strong>{tickets.length}</strong><small>{openOrders.length} open tickets</small></article>}
        {show("lowStock") && <article className="metric-card blue"><span><Package size={17} /></span><p>Low stock</p><strong>{lowStock.length}</strong><small>{stock.length} tracked items</small></article>}
        {show("customers") && <article className="metric-card purple"><span><Users size={17} /></span><p>Customers</p><strong>{customers.length}</strong><small>On file</small></article>}
      </div>

      {(show("chart") || show("alerts") || show("ticketQueue")) && (
        <div className="content-grid overview-main-grid">
          {show("chart") && (
            <article className="panel">
              <div className="panel-head">
                <div>
                  <p>Sales performance</p>
                  <h2>{currency} {netSales.toLocaleString()}</h2>
                  <small>{salesOrders.length ? "Last 7 days from stored orders" : "No sales recorded yet"}</small>
                </div>
              </div>
              {chartValues.some((value) => value > 0) ? (
                <BarChart values={chartValues} labels={weekdayLabels()} />
              ) : (
                <div className="placeholder-panel embedded"><p>{salesOrders.length ? "No sales in the last 7 days." : "Sales chart will appear after your first completed orders."}</p></div>
              )}
            </article>
          )}
          {show("ticketQueue") && (
            <article className="panel">
              <div className="panel-head"><div><p>{role === "Kitchen" ? "Pass" : "Bar"}</p><h3>{tickets.length} to make</h3></div><button className="link-button" onClick={() => navigate("orders")}>Open queue →</button></div>
              <div className="compact-list">
                {tickets.length === 0 ? (
                  <div className="placeholder-panel embedded"><p>Nothing waiting. New tickets land here.</p></div>
                ) : tickets.slice(0, 5).map((order) => (
                  <button className="attention-row" key={order.id} onClick={() => navigate("orders")}>
                    <span className="attention-icon"><Coffee size={16} /></span>
                    <div>
                      <strong>{order.number} · {order.status}</strong>
                      <small>{orderLineSummary(order)}</small>
                    </div>
                    <ArrowUpRight size={14} />
                  </button>
                ))}
              </div>
            </article>
          )}
          {show("alerts") && (
            <article className="panel attention-panel">
              <div className="panel-head"><div><p>Needs attention</p><h3>{lowStock.length} active alerts</h3></div><button className="link-button" onClick={() => navigate("inventory")}>View all →</button></div>
              {lowStock.length === 0 ? (
                <div className="placeholder-panel embedded"><p>No stock alerts. Inventory looks healthy.</p></div>
              ) : lowStock.slice(0, 3).map((item) => (
                <button className="attention-row" key={item.id} onClick={() => navigate("inventory")}>
                  <span className="attention-icon red"><Package size={16} /></span>
                  <div><strong>{item.name} is low</strong><small>{item.quantity} {item.unit} left · min {item.minimum}</small></div>
                  <ArrowUpRight size={14} />
                </button>
              ))}
            </article>
          )}
        </div>
      )}

      {(show("liveOrders") || show("activity")) && (
        <div className="content-grid overview-lower-grid">
          {show("liveOrders") && (
            <article className="panel">
              <div className="panel-head"><div><p>Live orders</p><h3>{openOrders.length} in progress</h3></div><button className="link-button" onClick={() => navigate("orders")}>Open KDS →</button></div>
              <div className="compact-list">
                {openOrders.length === 0 ? (
                  <div className="placeholder-panel embedded"><p>No open orders yet.</p></div>
                ) : openOrders.slice(0, 4).map((order) => (
                  <div className="compact-row" key={order.id}>
                    <strong>{order.number}</strong>
                    <span>{order.customer}</span>
                    <small>{order.items} items</small>
                    {profile.showMoney && <b>{currency} {order.total.toLocaleString()}</b>}
                    <StatusBadge tone={order.status}>{order.status}</StatusBadge>
                  </div>
                ))}
              </div>
            </article>
          )}
          {show("activity") && (
            <article className="panel">
              <div className="panel-head"><div><p>Recent activity</p><h3>Across your café</h3></div><span className="muted-label">Live</span></div>
              <div className="activity-list">
                {activities.length === 0 ? (
                  <div className="placeholder-panel embedded"><p>Activity will show as orders and stock changes happen.</p></div>
                ) : activities.slice(0, 4).map((item) => (
                  <div className="activity-row" key={item.id}>
                    <i className={`activity-dot ${item.tone}`} />
                    <div><strong>{item.title}</strong><small>{item.detail}</small></div>
                    <time>{item.time}</time>
                  </div>
                ))}
              </div>
            </article>
          )}
        </div>
      )}

      {show("teamOnShift") && (
        <article className="panel">
          <div className="panel-head"><div><p>On shift</p><h3>{working.length} working now</h3></div><button className="link-button" onClick={() => navigate("team")}>Open team →</button></div>
          {working.length === 0 ? (
            <div className="placeholder-panel embedded"><p>Nobody is clocked in.</p></div>
          ) : (
            <div className="compact-list">
              {working.slice(0, 6).map((employee) => (
                <div className="compact-row" key={employee.id}>
                  <strong>{employee.name}</strong>
                  <span>{employee.role}</span>
                  <small>{employee.shift || "No shift"}</small>
                  <StatusBadge tone={employee.status}>{employee.status}</StatusBadge>
                </div>
              ))}
            </div>
          )}
        </article>
      )}
    </div>
  );
}

function orderLineSummary(order: Order) {
  if (!order.lines?.length) return `${order.items} items · ${order.type}`;
  return order.lines.map((line) => `${line.quantity}× ${line.name}`).join(", ");
}

function weekdayLabels() {
  const days: string[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toLocaleDateString(undefined, { weekday: "short" }));
  }
  return days;
}

function buildDailyTotals(orders: Order[]) {
  const values: number[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const dayStart = new Date();
    dayStart.setDate(dayStart.getDate() - i);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    values.push(
      orders
        .filter((order) => {
          const placed = new Date(order.placedAtIso);
          return placed >= dayStart && placed < dayEnd;
        })
        .reduce((sum, order) => sum + order.total, 0),
    );
  }
  return values;
}
