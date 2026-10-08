"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Check,
  Download,
  Gift,
  Megaphone,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Star,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { useApp } from "@/components/app/app-provider";
import { BarChart, Modal, SectionHeader, StatusBadge } from "@/components/ui/prototype-ui";
import { TEAM_ROLES } from "@/lib/defaults";
import type { Campaign, Customer, Employee, Order } from "@/lib/types";

type ToastFn = (message: string) => void;

function formatMoney(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString()}`;
}

function ordersInRange(orders: Order[], range: string): Order[] {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  let start: Date;
  if (range === "Last 30 days") {
    start = new Date(now);
    start.setDate(start.getDate() - 29);
  } else if (range === "This year") {
    start = new Date(now.getFullYear(), 0, 1);
  } else {
    start = new Date(now);
    start.setDate(start.getDate() - 6);
  }
  start.setHours(0, 0, 0, 0);
  return orders.filter((order) => {
    const placed = new Date(order.placedAtIso);
    return placed >= start && placed <= end;
  });
}

function salesOrders(orders: Order[]) {
  return orders.filter((order) => order.status !== "Refunded");
}

function dailyBuckets(orders: Order[], range: string) {
  if (range === "This year") {
    const now = new Date();
    const months: { start: Date; end: Date; label: string }[] = [];
    for (let month = 0; month <= now.getMonth(); month += 1) {
      const start = new Date(now.getFullYear(), month, 1);
      const end = new Date(now.getFullYear(), month + 1, 1);
      months.push({
        start,
        end,
        label: start.toLocaleDateString(undefined, { month: "short" }),
      });
    }
    const values = months.map(({ start, end }) =>
      salesOrders(orders)
        .filter((order) => {
          const t = new Date(order.placedAtIso);
          return t >= start && t < end;
        })
        .reduce((sum, order) => sum + order.total, 0),
    );
    return { values, labels: months.map((entry) => entry.label) };
  }

  const dayCount = range === "Last 30 days" ? 30 : 7;
  const days: Date[] = [];
  for (let i = dayCount - 1; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    days.push(d);
  }
  const values = days.map((dayStart) => {
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    return salesOrders(orders)
      .filter((order) => {
        const t = new Date(order.placedAtIso);
        return t >= dayStart && t < dayEnd;
      })
      .reduce((sum, order) => sum + order.total, 0);
  });
  const labels =
    dayCount <= 7
      ? days.map((d) => d.toLocaleDateString(undefined, { weekday: "short" }))
      : days.map((d) => d.toLocaleDateString(undefined, { month: "numeric", day: "numeric" }));
  return { values, labels };
}

function exportOrdersCsv(orders: Order[], currency: string) {
  const header = ["Number", "Customer", "Type", "Status", "Items", "Subtotal", "Tax", "Total", "Payment", "Placed"];
  const rows = orders.map((order) => [
    order.number,
    order.customer,
    order.type,
    order.status,
    String(order.items),
    String(order.subtotal),
    String(order.tax),
    String(order.total),
    order.paymentMethod,
    order.placedAtIso,
  ]);
  const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `cafeos-orders-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

const ROLE_PERMISSIONS: { area: string; Owner: boolean; Manager: boolean; Cashier: boolean; Barista: boolean; Kitchen: boolean }[] = [
  { area: "Point of sale", Owner: true, Manager: true, Cashier: true, Barista: false, Kitchen: false },
  { area: "Orders & KDS", Owner: true, Manager: true, Cashier: true, Barista: true, Kitchen: true },
  { area: "Menu & pricing", Owner: true, Manager: true, Cashier: false, Barista: false, Kitchen: false },
  { area: "Inventory", Owner: true, Manager: true, Cashier: false, Barista: true, Kitchen: true },
  { area: "Customers & campaigns", Owner: true, Manager: true, Cashier: true, Barista: false, Kitchen: false },
  { area: "Team & schedule", Owner: true, Manager: true, Cashier: false, Barista: false, Kitchen: false },
  { area: "Reports", Owner: true, Manager: true, Cashier: false, Barista: false, Kitchen: false },
  { area: "Settings", Owner: true, Manager: false, Cashier: false, Barista: false, Kitchen: false },
  { area: "Refunds", Owner: true, Manager: true, Cashier: true, Barista: false, Kitchen: false },
];

export function CustomersModule({ toast }: { toast: ToastFn }) {
  const { customers, campaigns, feedback, settings, createCustomer, updateCustomer, removeCustomer, createCampaign, updateCampaign, deleteCampaign, createFeedback } = useApp();
  const currency = settings.currency;
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Customer | null>(null);
  const [tab, setTab] = useState("Customers");
  const [customerModal, setCustomerModal] = useState<"add" | Customer | null>(null);
  const [customerForm, setCustomerForm] = useState({ name: "", email: "", phone: "", favorite: "", segment: "Regular" as Customer["segment"] });
  const [loyaltyCustomerId, setLoyaltyCustomerId] = useState("");
  const [pointsDelta, setPointsDelta] = useState("50");
  const [campaignForm, setCampaignForm] = useState({ title: "", audience: "", offer: "" });
  const [feedbackForm, setFeedbackForm] = useState({ customerName: "", rating: "5", comment: "" });
  const [saving, setSaving] = useState(false);

  const shown = customers.filter((customer) => customer.name.toLowerCase().includes(query.toLowerCase()));
  const totalSpent = customers.reduce((sum, customer) => sum + customer.spent, 0);
  const avgValue = customers.length ? Math.round(totalSpent / customers.length) : 0;
  const loyaltyCustomer = customers.find((c) => c.id === loyaltyCustomerId) ?? customers[0];

  function openAddCustomer() {
    setCustomerForm({ name: "", email: "", phone: "", favorite: "", segment: "Regular" });
    setCustomerModal("add");
  }

  function openEditCustomer(customer: Customer) {
    setCustomerForm({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      favorite: customer.favorite,
      segment: customer.segment,
    });
    setCustomerModal(customer);
  }

  async function saveCustomer() {
    if (!customerForm.name.trim()) {
      toast("Customer name is required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: customerForm.name.trim(),
        email: customerForm.email.trim(),
        phone: customerForm.phone.trim(),
        favorite: customerForm.favorite.trim(),
        segment: customerForm.segment,
      };
      if (customerModal === "add") {
        await createCustomer(payload);
        toast("Customer added");
      } else if (customerModal && typeof customerModal === "object") {
        await updateCustomer(customerModal.id, payload);
        toast("Customer updated");
        setSelected((current) => (current?.id === customerModal.id ? { ...current, ...payload } : current));
      }
      setCustomerModal(null);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not save customer");
    } finally {
      setSaving(false);
    }
  }

  async function deleteCustomer(customer: Customer) {
    if (!window.confirm(`Remove ${customer.name}?`)) return;
    try {
      await removeCustomer(customer.id);
      if (selected?.id === customer.id) setSelected(null);
      toast("Customer removed");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not remove customer");
    }
  }

  async function adjustLoyaltyPoints() {
    if (!loyaltyCustomer) {
      toast("Add a customer first");
      return;
    }
    const delta = Number(pointsDelta);
    if (!Number.isFinite(delta) || delta === 0) {
      toast("Enter a non-zero points adjustment");
      return;
    }
    try {
      await updateCustomer(loyaltyCustomer.id, { points: Math.max(0, loyaltyCustomer.points + delta) });
      toast(`Points updated for ${loyaltyCustomer.name}`);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not adjust points");
    }
  }

  async function submitCampaign() {
    if (!campaignForm.title.trim()) {
      toast("Campaign title is required");
      return;
    }
    try {
      await createCampaign({
        title: campaignForm.title.trim(),
        audience: campaignForm.audience.trim() || "All customers",
        offer: campaignForm.offer.trim() || "Special offer",
        status: "Draft",
      });
      setCampaignForm({ title: "", audience: "", offer: "" });
      toast("Campaign created");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not create campaign");
    }
  }

  async function activateCampaign(campaign: Campaign) {
    try {
      await updateCampaign(campaign.id, { status: "Active" });
      toast(`${campaign.title} is now active`);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not activate campaign");
    }
  }

  async function deactivateCampaign(campaign: Campaign) {
    try {
      await updateCampaign(campaign.id, { status: "Draft" });
      toast(`${campaign.title} deactivated`);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not deactivate campaign");
    }
  }

  async function removeCampaign(campaign: Campaign) {
    if (!window.confirm(`Delete campaign "${campaign.title}"?`)) return;
    try {
      await deleteCampaign(campaign.id);
      toast("Campaign deleted");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not delete campaign");
    }
  }

  async function submitFeedback() {
    if (!feedbackForm.customerName.trim()) {
      toast("Guest name is required");
      return;
    }
    const rating = Number(feedbackForm.rating);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      toast("Rating must be between 1 and 5");
      return;
    }
    try {
      await createFeedback({
        customerName: feedbackForm.customerName.trim(),
        rating,
        comment: feedbackForm.comment.trim() || undefined,
      });
      setFeedbackForm({ customerName: "", rating: "5", comment: "" });
      toast("Feedback submitted");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not submit feedback");
    }
  }

  return (
    <div className="module-page">
      <SectionHeader
        title="Customers & loyalty"
        description="Understand every guest and bring them back"
        actions={
          <button className="btn btn-primary" onClick={openAddCustomer}>
            <UserPlus size={15} />
            Add customer
          </button>
        }
      />
      <div className="metric-grid mini">
        <article className="metric-card plain"><p>Total customers</p><strong>{customers.length}</strong><small>On file</small></article>
        <article className="metric-card plain"><p>Returning rate</p><strong>{customers.length ? `${Math.round((customers.filter((c) => c.visits > 1).length / customers.length) * 100)}%` : "—"}</strong><small>Visits &gt; 1</small></article>
        <article className="metric-card plain"><p>Loyalty members</p><strong>{customers.filter((c) => c.points > 0).length}</strong><small>With points</small></article>
        <article className="metric-card plain"><p>Customer value</p><strong>{formatMoney(avgValue, currency)}</strong><small>Average lifetime spend</small></article>
      </div>
      <div className="module-tabs">{["Customers", "Loyalty", "Campaigns", "Feedback"].map((value) => <button className={tab === value ? "active" : ""} key={value} onClick={() => setTab(value)}>{value}</button>)}</div>

      {tab === "Customers" && (
        <>
          <label className="field-search standalone"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search customers…" /></label>
          {shown.length === 0 ? (
            <div className="placeholder-panel panel"><Users size={28} /><h2>No customers yet</h2><p>Add guest profiles to track visits, spend, and loyalty.</p><button className="btn btn-primary" onClick={openAddCustomer}>Add customer</button></div>
          ) : (
            <div className="customer-grid">
              {shown.map((customer) => (
                <button className="panel customer-card" key={customer.id} onClick={() => setSelected(customer)}>
                  <div className="customer-top"><span>{customer.name.split(" ").map((n) => n[0]).join("")}</span><StatusBadge tone={customer.segment}>{customer.segment}</StatusBadge></div>
                  <h3>{customer.name}</h3>
                  <p>{customer.favorite || "No favourite yet"} · {customer.visits} visits</p>
                  <div><span><small>Total spent</small><strong>{formatMoney(customer.spent, currency)}</strong></span><span><small>Points</small><strong>{customer.points}</strong></span></div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "Loyalty" && (
        <div className="loyalty-layout">
          <article className="panel loyalty-hero">
            <span><Gift /></span>
            <div>
              <p>Rewards</p>
              <h2>Adjust loyalty points for any member.</h2>
              <small>Use positive values to award points and negative values to redeem.</small>
            </div>
          </article>
          <article className="panel settings-panel">
            <div className="form-grid">
              <label>
                Customer
                <select value={loyaltyCustomer?.id ?? ""} onChange={(e) => setLoyaltyCustomerId(e.target.value)}>
                  {customers.length === 0 ? <option value="">No customers</option> : customers.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.points} pts</option>)}
                </select>
              </label>
              <label>Points adjustment<input type="number" value={pointsDelta} onChange={(e) => setPointsDelta(e.target.value)} placeholder="50 or -25" /></label>
            </div>
            <button className="btn btn-primary" disabled={!loyaltyCustomer} onClick={() => void adjustLoyaltyPoints()}>Apply adjustment</button>
          </article>
        </div>
      )}

      {tab === "Campaigns" && (
        <>
          <article className="panel settings-panel">
            <div className="settings-title"><h2>New campaign</h2><p>Create an offer and activate when ready.</p></div>
            <div className="form-grid">
              <label className="span-2">Title<input value={campaignForm.title} onChange={(e) => setCampaignForm({ ...campaignForm, title: e.target.value })} placeholder="Weekend coffee boost" /></label>
              <label>Audience<input value={campaignForm.audience} onChange={(e) => setCampaignForm({ ...campaignForm, audience: e.target.value })} placeholder="Regular guests" /></label>
              <label>Offer<input value={campaignForm.offer} onChange={(e) => setCampaignForm({ ...campaignForm, offer: e.target.value })} placeholder="15% off next visit" /></label>
            </div>
            <button className="btn btn-primary" onClick={() => void submitCampaign()}><Megaphone size={15} />Create campaign</button>
          </article>
          <div className="campaign-grid">
            {campaigns.length === 0 ? (
              <div className="placeholder-panel panel embedded"><h2>No campaigns yet</h2><p>Create your first offer above.</p></div>
            ) : campaigns.map((campaign) => (
              <article className={`panel campaign-card ${campaign.status === "Active" ? "green" : "purple"}`} key={campaign.id}>
                <span><Megaphone /></span>
                <StatusBadge tone={campaign.status === "Active" ? "green" : "draft"}>{campaign.status}</StatusBadge>
                <h3>{campaign.title}</h3>
                <p>{campaign.audience}</p>
                <div><small>Offer</small><strong>{campaign.offer}</strong></div>
                <div className="product-image-actions">
                  {campaign.status === "Draft" ? (
                    <button className="btn btn-secondary" type="button" onClick={() => void activateCampaign(campaign)}>Activate</button>
                  ) : (
                    <button className="btn btn-secondary" type="button" onClick={() => void deactivateCampaign(campaign)}>Deactivate</button>
                  )}
                  <button className="btn btn-secondary" type="button" onClick={() => void removeCampaign(campaign)}><Trash2 size={14} />Delete</button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {tab === "Feedback" && (
        <>
          <article className="panel settings-panel">
            <div className="settings-title"><h2>Submit feedback</h2><p>Log guest ratings from the counter or follow-up calls.</p></div>
            <div className="form-grid">
              <label>Guest name<input value={feedbackForm.customerName} onChange={(e) => setFeedbackForm({ ...feedbackForm, customerName: e.target.value })} /></label>
              <label>Rating (1–5)<input type="number" min={1} max={5} value={feedbackForm.rating} onChange={(e) => setFeedbackForm({ ...feedbackForm, rating: e.target.value })} /></label>
              <label className="span-2">Comment<textarea rows={3} value={feedbackForm.comment} onChange={(e) => setFeedbackForm({ ...feedbackForm, comment: e.target.value })} placeholder="Optional notes" /></label>
            </div>
            <button className="btn btn-primary" onClick={() => void submitFeedback()}><Star size={15} />Submit feedback</button>
          </article>
          {feedback.length === 0 ? (
            <div className="placeholder-panel panel"><h2>No feedback yet</h2><p>Submitted ratings will appear below.</p></div>
          ) : (
            <div className="data-table panel">
              <div className="table-head"><span>Guest</span><span>Rating</span><span>Comment</span><span>When</span></div>
              {feedback.map((entry) => (
                <div className="table-row" key={entry.id}>
                  <strong>{entry.customerName}</strong>
                  <span>{entry.rating} / 5</span>
                  <span>{entry.comment || "—"}</span>
                  <small>{new Date(entry.createdAt).toLocaleString()}</small>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Customer profile">
        {selected && (
          <div className="profile-modal">
            <div className="profile-identity"><span>{selected.name.split(" ").map((n) => n[0]).join("")}</span><div><h2>{selected.name}</h2><p>{selected.email}<br />{selected.phone}</p></div></div>
            <div className="profile-stats">
              <div><small>Total spent</small><strong>{formatMoney(selected.spent, currency)}</strong></div>
              <div><small>Visits</small><strong>{selected.visits}</strong></div>
              <div><small>Points</small><strong>{selected.points}</strong></div>
            </div>
            <div className="profile-favorite"><span>☕</span><div><small>Favourite order</small><strong>{selected.favorite || "—"}</strong></div></div>
            <div className="product-image-actions">
              <button type="button" className="btn btn-secondary" onClick={() => { openEditCustomer(selected); setSelected(null); }}><Pencil size={15} />Edit</button>
              <button type="button" className="btn btn-secondary" onClick={() => void deleteCustomer(selected)}><Trash2 size={15} />Remove</button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!customerModal} onClose={() => !saving && setCustomerModal(null)} title={customerModal === "add" ? "Add customer" : "Edit customer"}>
        <div className="form-grid">
          <label className="span-2">Name<input value={customerForm.name} onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })} autoFocus /></label>
          <label>Email<input value={customerForm.email} onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })} /></label>
          <label>Phone<input value={customerForm.phone} onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })} /></label>
          <label>Favourite order<input value={customerForm.favorite} onChange={(e) => setCustomerForm({ ...customerForm, favorite: e.target.value })} /></label>
          <label>Segment<select value={customerForm.segment} onChange={(e) => setCustomerForm({ ...customerForm, segment: e.target.value as Customer["segment"] })}>{(["VIP", "Regular", "New", "At risk"] as const).map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
        </div>
        <button className="btn btn-primary btn-full" disabled={saving} onClick={() => void saveCustomer()}>{saving ? "Saving…" : "Save customer"}</button>
      </Modal>
    </div>
  );
}

export function TeamModule({ toast }: { toast: ToastFn }) {
  const { employees, createEmployee, updateEmployee, removeEmployee } = useApp();
  const [tab, setTab] = useState("Employees");
  const [employeeModal, setEmployeeModal] = useState<"add" | Employee | null>(null);
  const [employeeForm, setEmployeeForm] = useState<{ name: string; role: string; shift: string; status: Employee["status"]; hours: string; hourlyRate: string }>({ name: "", role: TEAM_ROLES[2], shift: "09:00 – 17:00", status: "Scheduled", hours: "32", hourlyRate: "500" });
  const [saving, setSaving] = useState(false);
  const working = employees.filter((employee) => employee.status === "Working").length;
  const labourToday = employees
    .filter((employee) => employee.status === "Working")
    .reduce((sum, employee) => sum + (employee.hours / 8) * employee.hourlyRate, 0);
  const weekLabour = employees.reduce((sum, employee) => sum + employee.hours * employee.hourlyRate, 0);

  function openAddEmployee() {
    setEmployeeForm({ name: "", role: TEAM_ROLES[2], shift: "09:00 – 17:00", status: "Scheduled", hours: "32", hourlyRate: "500" });
    setEmployeeModal("add");
  }

  function openEditEmployee(employee: Employee) {
    setEmployeeForm({ name: employee.name, role: employee.role, shift: employee.shift, status: employee.status, hours: String(employee.hours), hourlyRate: String(employee.hourlyRate) });
    setEmployeeModal(employee);
  }

  async function saveEmployee() {
    if (!employeeForm.name.trim() || !employeeForm.role.trim()) {
      toast("Name and role are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: employeeForm.name.trim(),
        role: employeeForm.role,
        shift: employeeForm.shift.trim(),
        status: employeeForm.status,
        hours: Number(employeeForm.hours) || 0,
        hourlyRate: Number(employeeForm.hourlyRate) || 0,
      };
      if (employeeModal === "add") {
        await createEmployee(payload);
        toast("Team member added");
      } else if (employeeModal && typeof employeeModal === "object") {
        await updateEmployee(employeeModal.id, payload);
        toast("Team member updated");
      }
      setEmployeeModal(null);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not save team member");
    } finally {
      setSaving(false);
    }
  }

  async function deleteEmployee(employee: Employee) {
    if (!window.confirm(`Remove ${employee.name}?`)) return;
    try {
      await removeEmployee(employee.id);
      toast("Team member removed");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not remove team member");
    }
  }

  async function toggleAttendance(employee: Employee) {
    const next: Employee["status"] = employee.status === "Working" ? "Off" : "Working";
    try {
      await updateEmployee(employee.id, { status: next });
      toast(`${employee.name} ${next === "Working" ? "clocked in" : "clocked out"}`);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not update attendance");
    }
  }

  async function updateShift(employee: Employee, shift: string) {
    try {
      await updateEmployee(employee.id, { shift });
      toast(`Shift updated for ${employee.name}`);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not update shift");
    }
  }

  return (
    <div className="module-page">
      <SectionHeader title="Team" description="Schedule, attendance and labour in one place" actions={<button className="btn btn-primary" onClick={openAddEmployee}><Plus size={15} />Add team member</button>} />
      <div className="metric-grid mini">
        <article className="metric-card plain"><p>Working now</p><strong>{working}</strong><small>of {employees.length} on file</small></article>
        <article className="metric-card plain"><p>Scheduled</p><strong>{employees.filter((e) => e.status === "Scheduled").length}</strong><small>Upcoming shifts</small></article>
        <article className="metric-card plain"><p>Off duty</p><strong>{employees.filter((e) => e.status === "Off").length}</strong><small>Not on clock</small></article>
        <article className="metric-card plain"><p>Labour today</p><strong>{Math.round(labourToday).toLocaleString()}</strong><small>Working staff · est. cost</small></article>
        <article className="metric-card plain"><p>Week labour</p><strong>{Math.round(weekLabour).toLocaleString()}</strong><small>hours × hourly rate</small></article>
      </div>
      <div className="module-tabs">{["Schedule", "Employees", "Attendance", "Roles"].map((value) => <button className={tab === value ? "active" : ""} key={value} onClick={() => setTab(value)}>{value}</button>)}</div>

      {tab === "Employees" && (
        employees.length === 0 ? (
          <div className="placeholder-panel panel"><Users size={28} /><h2>No team members</h2><p>Add staff profiles to manage shifts and attendance.</p></div>
        ) : (
          <div className="employee-grid">
            {employees.map((employee) => (
              <article className="panel employee-card" key={employee.id}>
                <div><span>{employee.avatar}</span><StatusBadge tone={employee.status}>{employee.status}</StatusBadge></div>
                <h3>{employee.name}</h3>
                <p>{employee.role}</p>
                <dl><div><dt>Today</dt><dd>{employee.shift || "—"}</dd></div><div><dt>This week</dt><dd>{employee.hours} h</dd></div></dl>
                <button onClick={() => openEditEmployee(employee)}>Edit profile →</button>
              </article>
            ))}
          </div>
        )
      )}

      {tab === "Schedule" && (
        employees.length === 0 ? (
          <div className="placeholder-panel panel"><h2>Schedule</h2><p>Add team members to assign shifts.</p></div>
        ) : (
          <div className="data-table panel">
            <div className="table-head"><span>Team member</span><span>Role</span><span>Shift</span><span>Status</span><span /></div>
            {employees.map((employee) => (
              <div className="table-row" key={employee.id}>
                <strong>{employee.name}</strong>
                <span>{employee.role}</span>
                <label><input defaultValue={employee.shift} onBlur={(e) => { if (e.target.value !== employee.shift) void updateShift(employee, e.target.value); }} /></label>
                <StatusBadge tone={employee.status}>{employee.status}</StatusBadge>
                <button onClick={() => openEditEmployee(employee)}>Edit</button>
              </div>
            ))}
          </div>
        )
      )}

      {tab === "Attendance" && (
        employees.length === 0 ? (
          <div className="placeholder-panel panel"><h2>Attendance</h2><p>Clock team members in when their shift starts.</p></div>
        ) : (
          <div className="data-table panel">
            <div className="table-head"><span>Team member</span><span>Role</span><span>Shift</span><span>Status</span><span /></div>
            {employees.map((employee) => (
              <div className="table-row" key={employee.id}>
                <strong>{employee.name}</strong>
                <span>{employee.role}</span>
                <span>{employee.shift}</span>
                <StatusBadge tone={employee.status}>{employee.status}</StatusBadge>
                <button onClick={() => void toggleAttendance(employee)}>{employee.status === "Working" ? "Clock out" : "Clock in"}</button>
              </div>
            ))}
          </div>
        )
      )}

      {tab === "Roles" && (
        <article className="panel settings-panel">
          <div className="settings-title"><h2>Role permissions</h2><p>Reference matrix (enforced when auth ships).</p></div>
          <div className="data-table">
            <div className="table-head"><span>Area</span>{TEAM_ROLES.map((role) => <span key={role}>{role}</span>)}</div>
            {ROLE_PERMISSIONS.map((row) => (
              <div className="table-row" key={row.area}>
                <strong>{row.area}</strong>
                {TEAM_ROLES.map((role) => <span key={role}>{row[role] ? "✓" : "—"}</span>)}
              </div>
            ))}
          </div>
          <div className="roles-grid">
            {TEAM_ROLES.map((role) => (
              <article className="panel role-card" key={role}><ShieldCheck /><h3>{role}</h3><p>Permissions are fixed for this release.</p></article>
            ))}
          </div>
        </article>
      )}

      <Modal open={!!employeeModal} onClose={() => !saving && setEmployeeModal(null)} title={employeeModal === "add" ? "Add team member" : "Edit team member"}>
        <div className="form-grid">
          <label className="span-2">Name<input value={employeeForm.name} onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })} /></label>
          <label>Role<select value={employeeForm.role} onChange={(e) => setEmployeeForm({ ...employeeForm, role: e.target.value })}>{TEAM_ROLES.map((role) => <option key={role} value={role}>{role}</option>)}</select></label>
          <label>Status<select value={employeeForm.status} onChange={(e) => setEmployeeForm({ ...employeeForm, status: e.target.value as Employee["status"] })}>{(["Working", "Scheduled", "Late", "Off"] as const).map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
          <label className="span-2">Shift<input value={employeeForm.shift} onChange={(e) => setEmployeeForm({ ...employeeForm, shift: e.target.value })} placeholder="09:00 – 17:00" /></label>
          <label>Hours this week<input type="number" min={0} value={employeeForm.hours} onChange={(e) => setEmployeeForm({ ...employeeForm, hours: e.target.value })} /></label>
          <label>Hourly rate<input type="number" min={0} value={employeeForm.hourlyRate} onChange={(e) => setEmployeeForm({ ...employeeForm, hourlyRate: e.target.value })} /></label>
        </div>
        <div className="product-image-actions">
          <button className="btn btn-primary" disabled={saving} onClick={() => void saveEmployee()}>{saving ? "Saving…" : "Save"}</button>
          {employeeModal && employeeModal !== "add" && (
            <button className="btn btn-secondary" onClick={() => void deleteEmployee(employeeModal)}><Trash2 size={15} />Remove</button>
          )}
        </div>
      </Modal>
    </div>
  );
}

export function ReportsModule({ toast }: { toast: ToastFn }) {
  const { orders, settings } = useApp();
  const currency = settings.currency;
  const [range, setRange] = useState("Last 7 days");
  const filtered = useMemo(() => salesOrders(ordersInRange(orders, range)), [orders, range]);
  const revenue = filtered.reduce((sum, order) => sum + order.total, 0);
  const chart = useMemo(() => dailyBuckets(ordersInRange(orders, range), range), [orders, range]);
  const dineIn = filtered.filter((order) => order.type === "Dine in").length;
  const pickup = filtered.filter((order) => order.type === "Pickup").length;
  const delivery = filtered.filter((order) => order.type === "Delivery").length;
  const totalOrders = filtered.length || 1;

  function exportCsv() {
    if (!filtered.length) {
      toast("No orders in this range to export");
      return;
    }
    exportOrdersCsv(filtered, currency);
    toast("CSV downloaded");
  }

  return (
    <div className="module-page">
      <SectionHeader
        title="Reports & analytics"
        description="Know what changed, why it changed and what to do next"
        actions={
          <>
            <select className="select-control" value={range} onChange={(e) => setRange(e.target.value)}>
              <option>Last 7 days</option>
              <option>Last 30 days</option>
              <option>This year</option>
            </select>
            <button className="btn btn-secondary" onClick={exportCsv}><Download size={15} />Export</button>
          </>
        }
      />
      <div className="metric-grid mini">
        <article className="metric-card plain"><p>Revenue</p><strong>{formatMoney(revenue, currency)}</strong><small>Excludes refunds</small></article>
        <article className="metric-card plain"><p>Orders</p><strong>{filtered.length}</strong><small>{range}</small></article>
        <article className="metric-card plain"><p>Avg ticket</p><strong>{formatMoney(filtered.length ? Math.round(revenue / filtered.length) : 0, currency)}</strong><small>Per order</small></article>
        <article className="metric-card plain"><p>Completed</p><strong>{filtered.filter((order) => order.status === "Completed").length}</strong><small>Fulfilled</small></article>
      </div>
      <div className="reports-grid">
        <article className="panel report-main">
          <div className="panel-head"><div><p>Revenue</p><h2>{formatMoney(revenue, currency)}</h2></div></div>
          {chart.values.some((value) => value > 0) ? (
            <BarChart values={chart.values} labels={chart.labels} />
          ) : (
            <div className="placeholder-panel embedded"><p>Charts populate after sales are recorded in this range.</p></div>
          )}
        </article>
        <article className="panel channel-panel">
          <div className="panel-head"><div><p>Order channels</p><h3>{filtered.length} orders</h3></div></div>
          <ul>
            <li><i className="dine" />Dine in <strong>{Math.round((dineIn / totalOrders) * 100)}%</strong></li>
            <li><i className="pickup" />Pickup <strong>{Math.round((pickup / totalOrders) * 100)}%</strong></li>
            <li><i className="delivery" />Delivery <strong>{Math.round((delivery / totalOrders) * 100)}%</strong></li>
          </ul>
        </article>
      </div>
    </div>
  );
}

export function SettingsModule({ toast }: { toast: ToastFn }) {
  const { tenant, branch, settings, employees, activities, saveSettings, hydrated } = useApp();
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState("Café");
  const [cafeName, setCafeName] = useState(tenant.name);
  const [branchName, setBranchName] = useState(branch.name);
  const [location, setLocation] = useState(branch.location);
  const [currency, setCurrency] = useState(settings.currency);
  const [timezone, setTimezone] = useState(settings.timezone);
  const [taxRatePercent, setTaxRatePercent] = useState(String(settings.taxRate * 100));
  const [serviceChargePercent, setServiceChargePercent] = useState(String(settings.serviceChargeRate * 100));
  const [categoriesText, setCategoriesText] = useState(settings.categories.join(", "));
  const [notify, setNotify] = useState({
    notifyLowStock: settings.notifyLowStock,
    notifyRefunds: settings.notifyRefunds,
    notifyLate: settings.notifyLate,
    notifyDaily: settings.notifyDaily,
  });
  const [integrations, setIntegrations] = useState({
    integrationWhatsapp: Boolean(settings.integrationWhatsapp),
    integrationStripe: Boolean(settings.integrationStripe),
    integrationPickme: Boolean(settings.integrationPickme),
    integrationXero: Boolean(settings.integrationXero),
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    setCafeName(tenant.name);
    setBranchName(branch.name);
    setLocation(branch.location);
    setCurrency(settings.currency);
    setTimezone(settings.timezone);
    setTaxRatePercent(String(settings.taxRate * 100));
    setServiceChargePercent(String(settings.serviceChargeRate * 100));
    setCategoriesText(settings.categories.join(", "));
    setNotify({
      notifyLowStock: settings.notifyLowStock,
      notifyRefunds: settings.notifyRefunds,
      notifyLate: settings.notifyLate,
      notifyDaily: settings.notifyDaily,
    });
    setIntegrations({
      integrationWhatsapp: Boolean(settings.integrationWhatsapp),
      integrationStripe: Boolean(settings.integrationStripe),
      integrationPickme: Boolean(settings.integrationPickme),
      integrationXero: Boolean(settings.integrationXero),
    });
  }, [hydrated, tenant, branch, settings]);

  async function toggleIntegration(key: keyof typeof integrations) {
    const next = { ...integrations, [key]: !integrations[key] };
    setIntegrations(next);
    try {
      await saveSettings(next);
      toast(next[key] ? "Integration connected" : "Integration disconnected");
    } catch (error) {
      setIntegrations(integrations);
      toast(error instanceof Error ? error.message : "Could not update integration");
    }
  }

  async function save() {
    const taxRate = Number(taxRatePercent) / 100;
    const serviceChargeRate = Number(serviceChargePercent) / 100;
    if (!Number.isFinite(taxRate) || taxRate < 0) {
      toast("Enter a valid tax rate");
      return;
    }
    setSaving(true);
    try {
      await saveSettings({
        tenantName: cafeName.trim(),
        branchName: branchName.trim(),
        location: location.trim(),
        currency,
        timezone,
        taxRate,
        serviceChargeRate,
        ...notify,
      });
      setSaved(true);
      toast("Settings saved");
      window.setTimeout(() => setSaved(false), 1800);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not save settings");
    } finally {
      setSaving(false);
    }
  }

  async function saveCategories() {
    const categories = categoriesText.split(",").map((c) => c.trim()).filter(Boolean);
    if (!categories.length) {
      toast("Add at least one category");
      return;
    }
    try {
      await saveSettings({ categories });
      toast("Categories updated");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not update categories");
    }
  }

  return (
    <div className="module-page">
      <SectionHeader title="Settings" description="Manage your café, team access and integrations" actions={<button className="btn btn-primary" disabled={saving} onClick={() => void save()}>{saved ? <Check size={15} /> : null}{saved ? "Saved" : saving ? "Saving…" : "Save changes"}</button>} />
      <div className="settings-layout">
        <aside className="settings-nav">{["Café", "Branches", "Users & roles", "Payments", "Integrations", "Notifications", "Audit log"].map((item) => <button className={tab === item ? "active" : ""} key={item} onClick={() => setTab(item)}>{item}</button>)}</aside>
        <section className="panel settings-panel">
          {tab === "Café" && (
            <>
              <div className="settings-title"><h2>Café profile</h2><p>Brand and regional defaults for this branch.</p></div>
              <div className="form-grid">
                <label>Café name<input value={cafeName} onChange={(e) => setCafeName(e.target.value)} /></label>
                <label>Branch<input value={branchName} onChange={(e) => setBranchName(e.target.value)} /></label>
                <label className="span-2">Location<input value={location} onChange={(e) => setLocation(e.target.value)} /></label>
                <label>Currency<select value={currency} onChange={(e) => setCurrency(e.target.value)}><option>LKR</option><option>USD</option><option>EUR</option><option>GBP</option></select></label>
                <label>Timezone<select value={timezone} onChange={(e) => setTimezone(e.target.value)}><option>Asia/Colombo</option><option>UTC</option><option>America/New_York</option><option>Europe/London</option></select></label>
                <label>Tax rate (%)<input type="number" min={0} step={0.1} value={taxRatePercent} onChange={(e) => setTaxRatePercent(e.target.value)} /></label>
              </div>
            </>
          )}
          {tab === "Branches" && (
            <>
              <div className="settings-title"><h2>Current branch</h2><p>Edit the active branch shown across POS and reports.</p></div>
              <div className="form-grid">
                <label>Branch name<input value={branchName} onChange={(e) => setBranchName(e.target.value)} /></label>
                <label className="span-2">Location<input value={location} onChange={(e) => setLocation(e.target.value)} /></label>
              </div>
            </>
          )}
          {tab === "Users & roles" && (
            <>
              <div className="settings-title"><h2>Users & roles</h2><p>Team members on file for this café.</p></div>
              {employees.length === 0 ? (
                <div className="placeholder-panel embedded"><p>No employees yet. Add them from the Team module.</p></div>
              ) : (
                <div className="data-table">
                  <div className="table-head"><span>Name</span><span>Role</span><span>Status</span><span>Shift</span></div>
                  {employees.map((employee) => (
                    <div className="table-row" key={employee.id}>
                      <strong>{employee.name}</strong>
                      <span>{employee.role}</span>
                      <StatusBadge tone={employee.status}>{employee.status}</StatusBadge>
                      <span>{employee.shift}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          {tab === "Payments" && (
            <>
              <div className="settings-title"><h2>Payments & tax</h2><p>Tax and service charge applied at checkout.</p></div>
              <div className="form-grid">
                <label>Tax rate (%)<input type="number" min={0} step={0.1} value={taxRatePercent} onChange={(e) => setTaxRatePercent(e.target.value)} /></label>
                <label>Service charge (%)<input type="number" min={0} step={0.1} value={serviceChargePercent} onChange={(e) => setServiceChargePercent(e.target.value)} /></label>
                <label>Currency<select value={currency} onChange={(e) => setCurrency(e.target.value)}><option>LKR</option><option>USD</option><option>EUR</option><option>GBP</option></select></label>
              </div>
              <p><small>Menu categories (comma-separated)</small></p>
              <label className="span-2"><textarea rows={2} value={categoriesText} onChange={(e) => setCategoriesText(e.target.value)} /></label>
              <button className="btn btn-secondary" onClick={() => void saveCategories()}>Update categories only</button>
            </>
          )}
          {tab === "Integrations" && (
            <>
              <div className="settings-title"><h2>Integrations</h2><p>Connect the tools your café already uses.</p></div>
              <div className="integration-list">
                {([
                  ["integrationWhatsapp", "WhatsApp Business", "Customer receipts and campaigns"],
                  ["integrationStripe", "Stripe", "Online card payments"],
                  ["integrationPickme", "PickMe Food", "Delivery order sync"],
                  ["integrationXero", "Xero", "Accounting export"],
                ] as const).map(([key, title, detail]) => (
                  <div key={key}>
                    <span>{title[0]}</span>
                    <div><strong>{title}</strong><small>{detail}</small></div>
                    <button type="button" className={integrations[key] ? "active" : ""} onClick={() => void toggleIntegration(key)}>
                      {integrations[key] ? "Connected" : "Connect"}
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
          {tab === "Notifications" && (
            <>
              <div className="settings-title"><h2>Notifications</h2><p>Choose what should get your attention.</p></div>
              <div className="notification-settings">
                {([
                  ["notifyLowStock", "Low-stock and expiry alerts"],
                  ["notifyRefunds", "Large refunds and voids"],
                  ["notifyLate", "Team late arrivals"],
                  ["notifyDaily", "Daily performance summary"],
                ] as const).map(([key, label]) => (
                  <label key={key}>
                    <div><strong>{label}</strong><small>Notify owner and branch manager</small></div>
                    <input type="checkbox" checked={notify[key]} onChange={(e) => setNotify({ ...notify, [key]: e.target.checked })} />
                  </label>
                ))}
              </div>
            </>
          )}
          {tab === "Audit log" && (
            <>
              <div className="settings-title"><h2>Audit log</h2><p>Recent activity across orders, stock, and team.</p></div>
              {activities.length === 0 ? (
                <div className="placeholder-panel embedded"><p>Activity will appear as your team uses CaféOS.</p></div>
              ) : (
                <div className="activity-list">
                  {activities.map((item) => (
                    <div className="activity-row" key={item.id}>
                      <i className={`activity-dot ${item.tone}`} />
                      <div><strong>{item.title}</strong><small>{item.detail}</small></div>
                      <time>{item.time}</time>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
