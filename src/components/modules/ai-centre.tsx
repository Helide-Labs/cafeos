"use client";

import { useState } from "react";
import { Bot, Check, ChevronRight, FileScan, Lightbulb, PackageSearch, Send, Sparkles, TrendingUp, Upload, WandSparkles } from "lucide-react";
import { usePrototype } from "@/components/prototype/prototype-provider";
import { Modal, SectionHeader, StatusBadge } from "@/components/ui/prototype-ui";

type Message = { role: "assistant" | "user"; text: string; sources?: string[] };

const suggestions = [
  "Why was profit lower this week?",
  "What should I promote today?",
  "Which stock will run out next?",
  "How can I reduce waste?",
];

function answerFor(question: string) {
  const query = question.toLowerCase();
  if (query.includes("profit")) return { text: "Revenue increased 12.8%, but coffee bean costs rose 8% and milk waste increased 6%. Together those changes reduced estimated gross profit by LKR 31,400. Updating three low-margin drink prices by 3–4% would recover most of the gap.", sources: ["Sales: LKR 1.18M", "Arabica cost: +8%", "Milk waste: +6%"] };
  if (query.includes("promote")) return { text: "Promote Matcha Latte between 2–5 PM. It has a 59% margin, adequate stock for 94 servings, and is strongly preferred by your growing 18–28 customer segment. A 10% loyalty bonus could add an estimated LKR 18,400 gross profit today.", sources: ["94 servings in stock", "59% margin", "Afternoon demand: +22%"] };
  if (query.includes("stock") || query.includes("run out")) return { text: "Fresh milk is the immediate risk: 8.2 L remains against average daily usage of 12.4 L. Vanilla syrup is also below its minimum, but current usage gives you roughly 2.5 days. I recommend receiving PO-0028 before tomorrow's opening shift.", sources: ["Milk: 8.2 L", "Daily milk use: 12.4 L", "PO-0028: delivered"] };
  if (query.includes("waste")) return { text: "Milk accounts for 46% of this month's waste cost. Most waste is logged during closing shifts. Smaller late-day prep batches and a 7 PM stock check could save an estimated LKR 6,200 per month.", sources: ["Waste: LKR 18,450", "Milk share: 46%", "Closing shift: 61%"] };
  return { text: "I reviewed sales, margin, stock, customer and staffing demo data. The clearest opportunity is better afternoon product mix: Matcha Latte and Butter Croissant have healthy margins and enough stock, while Mango Smoothie should not be discounted further.", sources: ["Sales mix", "Recipe margins", "Current stock"] };
}

export default function AiCentre({ toast }: { toast: (message: string) => void }) {
  const { adjustStock, addActivity } = usePrototype();
  const [tab, setTab] = useState("Assistant");
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", text: "Good morning, Pasindu. I analysed today's café data. Sales are ahead of yesterday, but fresh milk may run out before tomorrow's morning rush. What would you like to understand?", sources: ["Live sales", "Inventory", "7-day usage"] }]);
  const [input, setInput] = useState("");
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [scanStage, setScanStage] = useState<"upload" | "scanning" | "review" | "approved">("upload");

  function ask(question = input) {
    if (!question.trim()) return;
    setMessages((current) => [...current, { role: "user", text: question }]);
    setInput("");
    window.setTimeout(() => setMessages((current) => [...current, { role: "assistant", ...answerFor(question) }]), 500);
  }

  function beginScan() {
    setScanStage("scanning");
    window.setTimeout(() => setScanStage("review"), 1100);
  }

  function approveInvoice() {
    adjustStock("s2", 10);
    adjustStock("s1", 20);
    addActivity({ title: "AI invoice approved", detail: "Serendib Roasters · LKR 93,500", tone: "blue" });
    setScanStage("approved");
    toast("Invoice approved · inventory updated");
  }

  return <div className="module-page ai-page">
    <SectionHeader eyebrow="Café intelligence" title="AI centre" description="Recommendations grounded in your operational data" actions={<span className="demo-ai-badge"><Sparkles size={13} />Simulated AI · Demo data</span>} />
    <div className="module-tabs ai-tabs">{["Assistant", "Invoice scanner", "Demand forecast", "Recommendations"].map((value) => <button className={tab === value ? "active" : ""} key={value} onClick={() => setTab(value)}>{value}</button>)}</div>
    {tab === "Assistant" && <div className="assistant-layout">
      <section className="panel chat-panel">
        <div className="chat-head"><span><Bot size={20} /></span><div><strong>CaféOS Advisor</strong><small><i /> Analysing Bloom Coffee · Colombo 07</small></div></div>
        <div className="messages">{messages.map((message, index) => <div className={`message ${message.role}`} key={`${message.role}-${index}`}>{message.role === "assistant" && <span className="message-avatar"><WandSparkles size={15} /></span>}<div><p>{message.text}</p>{message.sources && <div className="source-chips">{message.sources.map((source) => <span key={source}>{source}</span>)}</div>}</div></div>)}</div>
        <div className="chat-input"><input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask()} placeholder="Ask about sales, profit, stock, customers…" /><button onClick={() => ask()}><Send size={16} /></button></div>
      </section>
      <aside className="assistant-side">
        <article className="panel suggested-card"><p>Suggested questions</p>{suggestions.map((question) => <button key={question} onClick={() => ask(question)}>{question}<ChevronRight size={14} /></button>)}</article>
        <article className="panel ai-context"><p>Data available to AI</p>{[["Sales & orders", "Live"], ["Recipes & COGS", "12 items"], ["Inventory", "7 items"], ["Customers", "1,248"], ["Team & labour", "12 staff"]].map((item) => <div key={item[0]}><span><Check size={12} />{item[0]}</span><small>{item[1]}</small></div>)}</article>
      </aside>
    </div>}
    {tab === "Invoice scanner" && <div className="scanner-layout"><article className="panel scanner-hero"><span><FileScan size={28} /></span><p>AI invoice scanner</p><h2>Turn supplier invoices into updated stock and costs.</h2><small>Upload a PDF or photo. CaféOS extracts line items, detects price changes and prepares a review before anything is posted.</small><button className="btn btn-primary" onClick={() => { setScanStage("upload"); setInvoiceOpen(true); }}><Upload size={15} />Scan demo invoice</button></article><div className="scanner-steps">{[["1", "Upload", "PDF, photo or email"], ["2", "AI extraction", "Supplier and line items"], ["3", "Review", "Confirm changes"], ["4", "Update", "Stock, recipes and COGS"]].map((step) => <div className="panel" key={step[0]}><span>{step[0]}</span><strong>{step[1]}</strong><small>{step[2]}</small></div>)}</div><article className="panel scan-history"><div className="panel-head"><div><p>Recent scans</p><h3>Invoice history</h3></div></div>{[["INV-8921", "ABC Foods", "LKR 48,250", "Approved"], ["SR-10928", "Serendib Roasters", "LKR 85,000", "Approved"], ["PK-4431", "PackRight", "LKR 27,800", "Needs review"]].map((row) => <div key={row[0]}><span><FileScan size={15} /></span><strong>{row[0]}</strong><p>{row[1]}</p><b>{row[2]}</b><StatusBadge tone={row[3]}>{row[3]}</StatusBadge></div>)}</article></div>}
    {tab === "Demand forecast" && <Forecast />}
    {tab === "Recommendations" && <Recommendations toast={toast} />}

    <Modal open={invoiceOpen} onClose={() => setInvoiceOpen(false)} title="AI invoice scanner" wide>
      {scanStage === "upload" && <div className="upload-zone" onClick={beginScan}><Upload size={30} /><h3>Drop supplier invoice here</h3><p>For this prototype, use our prepared Serendib Roasters invoice.</p><button className="btn btn-primary">Choose demo invoice</button><small>JPG, PNG or PDF · up to 10 MB</small></div>}
      {scanStage === "scanning" && <div className="scanning-state"><span><FileScan size={30} /></span><h3>Reading invoice…</h3><p>Extracting supplier, quantities, prices and taxes</p><div><i /></div></div>}
      {scanStage === "review" && <div className="invoice-review"><div className="invoice-summary"><div><small>Supplier</small><strong>Serendib Roasters</strong></div><div><small>Invoice</small><strong>SR-10942</strong></div><div><small>Date</small><strong>17 Sep 2026</strong></div><div><small>Total</small><strong>LKR 93,500</strong></div></div><div className="invoice-lines"><header><span>Item</span><span>Quantity</span><span>Unit price</span><span>Change</span><span>Total</span></header><div><strong>Arabica beans</strong><span>10 kg</span><span>LKR 8,500</span><StatusBadge tone="warning">+8.2%</StatusBadge><b>LKR 85,000</b></div><div><strong>Fresh milk</strong><span>20 L</span><span>LKR 425</span><StatusBadge tone="healthy">No change</StatusBadge><b>LKR 8,500</b></div></div><div className="ai-impact"><Sparkles size={18} /><div><strong>17 recipes will be affected</strong><p>Average coffee drink cost rises LKR 11. Estimated monthly COGS impact: +LKR 24,600.</p></div></div><footer><button className="btn btn-secondary" onClick={() => setInvoiceOpen(false)}>Save for later</button><button className="btn btn-primary" onClick={approveInvoice}>Approve and update inventory</button></footer></div>}
      {scanStage === "approved" && <div className="receipt-success"><span><Check size={28} /></span><h3>Invoice approved</h3><p>Stock, ingredient costs and affected recipe margins have been updated.</p><button className="btn btn-primary" onClick={() => setInvoiceOpen(false)}>Done</button></div>}
    </Modal>
  </div>;
}

function Forecast() {
  const forecast = [284, 312, 298, 326, 354, 418, 389];
  return <div className="forecast-layout"><div className="metric-grid mini"><article className="metric-card plain"><p>Tomorrow&apos;s orders</p><strong>324</strong><small className="success-text">88% confidence</small></article><article className="metric-card plain"><p>Expected revenue</p><strong>LKR 194K</strong><small>Range LKR 178–211K</small></article><article className="metric-card plain"><p>Peak period</p><strong>8:30–10:30</strong><small>92 orders predicted</small></article><article className="metric-card plain"><p>Weather effect</p><strong>+6%</strong><small>Warm and dry · 29°C</small></article></div><article className="panel forecast-chart"><div className="panel-head"><div><p>Seven-day demand forecast</p><h3>Expected orders</h3></div><StatusBadge tone="healthy">High confidence</StatusBadge></div><div className="forecast-bars">{forecast.map((value, index) => <div key={value}><span>{value}</span><i style={{ height: `${value / 4.5}px` }} /><small>{["Fri", "Sat", "Sun", "Mon", "Tue", "Wed", "Thu"][index]}</small></div>)}</div></article><article className="panel requirement-card"><div className="panel-head"><div><p>Tomorrow&apos;s requirements</p><h3>Prepare before opening</h3></div></div>{[["Coffee beans", "6.2 kg", "18.4 kg", "Enough"], ["Fresh milk", "24 L", "8.2 L", "Order now"], ["Oat milk", "8 L", "14 L", "Enough"], ["12oz cups", "380 pcs", "620 pcs", "Enough"]].map((row) => <div key={row[0]}><span><PackageSearch size={16} /></span><strong>{row[0]}</strong><p>Need {row[1]} · Have {row[2]}</p><StatusBadge tone={row[3] === "Enough" ? "healthy" : "low"}>{row[3]}</StatusBadge></div>)}</article></div>;
}

function Recommendations({ toast }: { toast: (message: string) => void }) {
  const cards = [
    { icon: <TrendingUp />, label: "Revenue opportunity", title: "Promote Matcha Latte from 2–5 PM", text: "Strong margin, adequate stock and rising demand in your afternoon customer segment.", impact: "+LKR 18,400 est. profit", confidence: "91%" },
    { icon: <PackageSearch />, label: "Stock risk", title: "Receive milk before tomorrow morning", text: "Current milk stock covers only 66% of expected demand for the next opening shift.", impact: "Avoid 34 lost orders", confidence: "94%" },
    { icon: <Lightbulb />, label: "Margin protection", title: "Review three coffee prices", text: "The latest bean increase reduced margins. A 3–4% price update restores your target.", impact: "+LKR 24,600 / month", confidence: "87%" },
    { icon: <Sparkles />, label: "Waste reduction", title: "Add a 7 PM milk stock check", text: "Closing-shift milk waste represents 46% of monthly waste cost.", impact: "Save LKR 6,200 / month", confidence: "83%" },
  ];
  return <div className="recommendations-grid">{cards.map((card, index) => <article className="panel recommendation-card" key={card.title}><header><span>{card.icon}</span><p>{card.label}</p><StatusBadge tone="healthy">{card.confidence} confidence</StatusBadge></header><h2>{card.title}</h2><p>{card.text}</p><div><small>Potential impact</small><strong>{card.impact}</strong></div><footer><button className="btn btn-secondary" onClick={() => toast(index === 0 ? "Campaign draft created" : "Recommendation saved to action plan")}>{index === 0 ? "Create campaign" : "Add to action plan"}</button><button>Why this? →</button></footer></article>)}</div>;
}
