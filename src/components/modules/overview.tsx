"use client";

import { ArrowUpRight, Clock3, Package, ShoppingBag, Sparkles, Users } from "lucide-react";
import { usePrototype } from "@/components/prototype/prototype-provider";
import { BarChart, SectionHeader, StatusBadge } from "@/components/ui/prototype-ui";

export default function Overview({ navigate }: { navigate: (view: string) => void }) {
  const { orders, stock, customers, activities } = usePrototype();
  const lowStock = stock.filter((item) => item.quantity < item.minimum);
  const openOrders = orders.filter((order) => order.status !== "Completed");

  return (
    <div className="module-page">
      <SectionHeader
        eyebrow="Thursday, 17 September"
        title="Good morning, Pasindu"
        description="Here is what is happening at Bloom Coffee today."
        actions={<><span className="live-chip"><i />Live data</span><button className="btn btn-primary" onClick={() => navigate("pos")}>New order</button></>}
      />

      <div className="metric-grid">
        <article className="metric-card green"><span><ArrowUpRight size={17} /></span><p>Net sales</p><strong>LKR 184,250</strong><small><b>+14.2%</b> vs yesterday</small></article>
        <article className="metric-card sand"><span><ShoppingBag size={17} /></span><p>Orders</p><strong>312</strong><small><b>+8.4%</b> · 28 online</small></article>
        <article className="metric-card blue"><span><Sparkles size={17} /></span><p>Gross profit</p><strong>LKR 119,762</strong><small><b>65.0%</b> gross margin</small></article>
        <article className="metric-card purple"><span><Users size={17} /></span><p>Customers</p><strong>{customers.length + 1},248</strong><small><b>+32</b> this week</small></article>
      </div>

      <div className="content-grid overview-main-grid">
        <article className="panel">
          <div className="panel-head"><div><p>Sales performance</p><h2>LKR 1.18M</h2><small className="success-text">↗ 12.8% from last week</small></div><button className="select-control">Last 7 days⌄</button></div>
          <BarChart values={[118, 142, 131, 166, 149, 192, 184]} labels={["Fri", "Sat", "Sun", "Mon", "Tue", "Wed", "Thu"]} />
        </article>
        <article className="panel attention-panel">
          <div className="panel-head"><div><p>Needs attention</p><h3>{lowStock.length + 2} active alerts</h3></div><button className="link-button" onClick={() => navigate("inventory")}>View all →</button></div>
          <button className="attention-row" onClick={() => navigate("inventory")}><span className="attention-icon red"><Package size={16} /></span><div><strong>Milk may run out tomorrow</strong><small>8.2 L left · 12.4 L daily usage</small></div><ArrowUpRight size={14} /></button>
          <button className="attention-row" onClick={() => navigate("menu")}><span className="attention-icon amber"><ArrowUpRight size={16} /></span><div><strong>Bean cost increased 8%</strong><small>17 menu margins affected</small></div><ArrowUpRight size={14} /></button>
          <button className="attention-row" onClick={() => navigate("team")}><span className="attention-icon blue"><Clock3 size={16} /></span><div><strong>One team member is late</strong><small>Morning shift · Colombo 07</small></div><ArrowUpRight size={14} /></button>
        </article>
      </div>

      <div className="content-grid overview-lower-grid">
        <article className="panel">
          <div className="panel-head"><div><p>Live orders</p><h3>{openOrders.length} in progress</h3></div><button className="link-button" onClick={() => navigate("orders")}>Open KDS →</button></div>
          <div className="compact-list">
            {openOrders.slice(0, 4).map((order) => <div className="compact-row" key={order.id}><strong>{order.number}</strong><span>{order.customer}</span><small>{order.items} items</small><b>LKR {order.total.toLocaleString()}</b><StatusBadge tone={order.status}>{order.status}</StatusBadge></div>)}
          </div>
        </article>
        <article className="panel">
          <div className="panel-head"><div><p>Recent activity</p><h3>Across your café</h3></div><span className="muted-label">Today</span></div>
          <div className="activity-list">
            {activities.slice(0, 4).map((item) => <div className="activity-row" key={item.id}><i className={`activity-dot ${item.tone}`} /><div><strong>{item.title}</strong><small>{item.detail}</small></div><time>{item.time}</time></div>)}
          </div>
        </article>
      </div>

      <div className="demo-callout"><Sparkles size={18} /><div><strong>AI has found 3 opportunities</strong><p>Promote Matcha Latte this afternoon and you could add an estimated LKR 18,400 in gross profit.</p></div><button onClick={() => navigate("ai")}>View AI insights</button></div>
    </div>
  );
}
