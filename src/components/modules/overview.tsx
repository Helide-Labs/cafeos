"use client";

import { ArrowUpRight, Package, ShoppingBag, Users } from "lucide-react";
import { useApp } from "@/components/app/app-provider";
import { BarChart, SectionHeader, StatusBadge } from "@/components/ui/prototype-ui";
import type { Order } from "@/lib/types";

export default function Overview({ navigate }: { navigate: (view: string) => void }) {
  const { orders, stock, customers, activities, tenant, settings } = useApp();
  const currency = settings.currency;
  const salesOrders = orders.filter((order) => order.status !== "Refunded");
  const lowStock = stock.filter((item) => item.quantity < item.minimum);
  const openOrders = orders.filter((order) => order.status !== "Completed" && order.status !== "Refunded");
  const netSales = salesOrders.reduce((sum, order) => sum + order.total, 0);
  const chartValues = buildDailyTotals(salesOrders);
  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="module-page">
      <SectionHeader
        eyebrow={todayLabel}
        title={`Welcome to ${tenant.name || "your café"}`}
        description={orders.length || stock.length || customers.length
          ? "Live operational snapshot for your branch."
          : "Your café is ready. Add menu items and take the first order."}
        actions={<><span className="live-chip"><i />Live data</span><button className="btn btn-primary" onClick={() => navigate("pos")}>New order</button></>}
      />

      <div className="metric-grid">
        <article className="metric-card green"><span><ArrowUpRight size={17} /></span><p>Net sales</p><strong>{currency} {netSales.toLocaleString()}</strong><small>Excludes refunds</small></article>
        <article className="metric-card sand"><span><ShoppingBag size={17} /></span><p>Orders</p><strong>{salesOrders.length}</strong><small>{openOrders.length} in progress</small></article>
        <article className="metric-card blue"><span><Package size={17} /></span><p>Low stock</p><strong>{lowStock.length}</strong><small>{stock.length} tracked items</small></article>
        <article className="metric-card purple"><span><Users size={17} /></span><p>Customers</p><strong>{customers.length}</strong><small>On file</small></article>
      </div>

      <div className="content-grid overview-main-grid">
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
            <div className="placeholder-panel embedded"><p>Sales chart will appear after your first completed orders.</p></div>
          )}
        </article>
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
      </div>

      <div className="content-grid overview-lower-grid">
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
                <b>{currency} {order.total.toLocaleString()}</b>
                <StatusBadge tone={order.status}>{order.status}</StatusBadge>
              </div>
            ))}
          </div>
        </article>
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
      </div>
    </div>
  );
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
