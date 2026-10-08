"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronRight, Clock3, CreditCard, ImagePlus, Minus, PackageCheck, Pencil, Plus, Search, ShoppingCart, SlidersHorizontal, Trash2, Upload, UtensilsCrossed, X } from "lucide-react";
import { useApp } from "@/components/app/app-provider";
import { Modal, SectionHeader, StatusBadge } from "@/components/ui/prototype-ui";
import {
  CATEGORY_EMOJI,
  DEFAULT_CATEGORY_EMOJI,
  PRODUCT_CATEGORIES,
  fileToProductImage,
} from "@/lib/product-form";
import { STOCK_CATEGORIES, STOCK_UNITS } from "@/lib/defaults";
import { computeOrderMoney, recipeLineCost, stockInventoryValue, stockUnitCost } from "@/lib/money";
import type { Campaign, CartItem, Customer, ModifierGroup as ModifierGroupDef, Order, Product, RecipeLine, StockItem } from "@/lib/types";

type ToastFn = (message: string) => void;

function ProductMedia({ product, className = "" }: { product: Pick<Product, "name" | "emoji" | "imageUrl">; className?: string }) {
  if (product.imageUrl) {
    return <img src={product.imageUrl} alt={product.name} className={`product-media ${className}`} />;
  }
  return <span className={`product-emoji ${className}`}>{product.emoji}</span>;
}

function parseOfferDiscount(offer: string, basis: number) {
  const pctMatch = offer.match(/(\d+(?:\.\d+)?)\s*%/);
  if (pctMatch) return Math.round(basis * Number(pctMatch[1]) / 100);
  const fixedMatch = offer.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  if (fixedMatch) return Math.round(Number(fixedMatch[1]));
  return 0;
}

function modifierGroupsForProduct(product: Product, groups: ModifierGroupDef[]) {
  const linked = groups.filter(
    (group) =>
      product.modifierGroupIds?.includes(group.id) ||
      group.appliesTo.includes(product.id) ||
      group.appliesTo.includes(product.category),
  );
  return linked.length ? linked : null;
}

function modifierExtraPrice(modifierNames: string[], catalog: ModifierGroupDef[] | null) {
  if (!catalog) return 0;
  let sum = 0;
  for (const name of modifierNames) {
    for (const group of catalog) {
      const option = group.options.find((entry) => entry.name === name);
      if (option) {
        sum += option.price;
        break;
      }
    }
  }
  return sum;
}

export function PosModule({ toast }: { toast: ToastFn }) {
  const { products, customers, settings, modifierGroups, campaigns, createOrder, branch } = useApp();
  const currency = settings.currency;
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [popularOnly, setPopularOnly] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selected, setSelected] = useState<Product | null>(null);
  const [modifiers, setModifiers] = useState<string[]>([]);
  const [paying, setPaying] = useState(false);
  const [paymentStep, setPaymentStep] = useState<"choose" | "cash" | "split">("choose");
  const [amountTendered, setAmountTendered] = useState("");
  const [splitCash, setSplitCash] = useState("");
  const [splitCard, setSplitCard] = useState("");
  const [pickingCustomer, setPickingCustomer] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orderType, setOrderType] = useState<Order["type"]>("Dine in");
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [discountInput, setDiscountInput] = useState("");
  const [tipInput, setTipInput] = useState("");
  const [pointsToRedeem, setPointsToRedeem] = useState("");
  const [activeCampaignId, setActiveCampaignId] = useState<string>("");
  const categories = ["All", ...new Set(products.map((product) => product.category))];
  const activeCampaigns = campaigns.filter((entry) => entry.status === "Active");
  const selectedCampaign = activeCampaigns.find((entry) => entry.id === activeCampaignId) ?? null;

  const manualDiscount = Math.max(0, Number(discountInput) || 0);
  const tip = Math.max(0, Number(tipInput) || 0);
  const baseMoney = computeOrderMoney(cart, settings, { discount: 0, tip: 0 });
  const campaignDiscount = selectedCampaign ? parseOfferDiscount(selectedCampaign.offer, baseMoney.subtotal) : 0;
  const maxLoyaltyPoints = customer ? Math.min(customer.points, baseMoney.subtotal + baseMoney.tax + baseMoney.serviceCharge + tip - manualDiscount - campaignDiscount) : 0;
  const loyaltyPoints = customer ? Math.min(maxLoyaltyPoints, Math.max(0, Math.round(Number(pointsToRedeem) || 0))) : 0;
  const loyaltyDiscount = loyaltyPoints;
  const totalDiscount = manualDiscount + campaignDiscount + loyaltyDiscount;
  const money = computeOrderMoney(cart, settings, { discount: totalDiscount, tip });
  const due = money.total;

  const filtered = products.filter((product) => {
    if (category !== "All" && product.category !== category) return false;
    if (!product.name.toLowerCase().includes(query.toLowerCase())) return false;
    if (availableOnly && !product.available) return false;
    if (popularOnly && !product.popular) return false;
    return true;
  });
  const activeModifierCatalog = selected ? modifierGroupsForProduct(selected, modifierGroups) : null;

  function openProduct(product: Product) {
    if (!product.available) return;
    setSelected(product);
    setModifiers([]);
  }

  function addSelected() {
    if (!selected) return;
    const catalog = modifierGroupsForProduct(selected, modifierGroups);
    const modifierPrice = modifierExtraPrice(modifiers, catalog);
    setCart((current) => [...current, { id: `${selected.id}-${Date.now()}`, productId: selected.id, name: selected.name, price: selected.price + modifierPrice, quantity: 1, modifiers: [...modifiers] }]);
    setSelected(null);
    toast(`${selected.name} added to order`);
  }

  function updateQuantity(id: string, delta: number) {
    setCart((current) => current.map((item) => item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item).filter((item) => item.quantity > 0));
  }

  function resetPaymentModal() {
    setPaying(false);
    setPaymentStep("choose");
    setAmountTendered("");
    setSplitCash("");
    setSplitCard("");
  }

  async function completePayment(method: string, payment?: { amountTendered?: number; changeDue?: number }) {
    if (!cart.length) return;
    try {
      const order = await createOrder({
        cart,
        type: orderType,
        customer: customer?.name ?? "Walk-in",
        customerId: customer?.id,
        subtotal: money.subtotal,
        tax: money.tax,
        serviceCharge: money.serviceCharge,
        discount: money.discount,
        tip: money.tip,
        paymentMethod: method,
        amountTendered: payment?.amountTendered,
        changeDue: payment?.changeDue,
        pointsRedeemed: loyaltyPoints > 0 ? loyaltyPoints : undefined,
      });
      setLastOrder(order);
      resetPaymentModal();
      setCart([]);
      setDiscountInput("");
      setTipInput("");
      setPointsToRedeem("");
      setActiveCampaignId("");
      setCustomer(null);
      toast(`${method} payment approved · ${order.number}`);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not create order");
    }
  }

  function confirmCashPayment() {
    const tendered = Math.round(Number(amountTendered) || 0);
    if (tendered < due) {
      toast("Tendered amount must cover the total due");
      return;
    }
    void completePayment("Cash", { amountTendered: tendered, changeDue: tendered - due });
  }

  function confirmSplitPayment() {
    const cashPart = Math.round(Number(splitCash) || 0);
    const cardPart = Math.round(Number(splitCard) || 0);
    if (cashPart + cardPart !== due) {
      toast(`Split amounts must total ${currency} ${due.toLocaleString()}`);
      return;
    }
    void completePayment(`Split (${currency} ${cashPart.toLocaleString()} cash + ${currency} ${cardPart.toLocaleString()} card)`);
  }

  return (
    <div className="module-page pos-page">
      <SectionHeader title="Point of sale" description={branch.name} actions={<div className="segmented">{(["Dine in", "Pickup", "Delivery"] as Order["type"][]).map((type) => <button className={orderType === type ? "active" : ""} key={type} onClick={() => setOrderType(type)}>{type}</button>)}</div>} />
      <div className="pos-layout">
        <section className="pos-catalog panel">
          <div className="catalog-tools">
            <label className="field-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search menu…" /></label>
            <button type="button" className={`square-btn ${filtersOpen || availableOnly || popularOnly ? "active" : ""}`} title="Toggle filters" onClick={() => setFiltersOpen((v) => !v)}><SlidersHorizontal size={17} /></button>
            {filtersOpen && (
              <div className="segmented compact">
                <button type="button" className={availableOnly ? "active" : ""} onClick={() => setAvailableOnly((v) => !v)}>Available</button>
                <button type="button" className={popularOnly ? "active" : ""} onClick={() => setPopularOnly((v) => !v)}>Popular</button>
              </div>
            )}
          </div>
          <div className="category-tabs">{categories.map((item) => <button className={category === item ? "active" : ""} key={item} onClick={() => setCategory(item)}>{item}</button>)}</div>
          <div className="product-grid">
            {filtered.length === 0 ? (
              <div className="placeholder-panel embedded"><strong>No products yet</strong><span>Add items in Menu & recipes to start selling.</span></div>
            ) : filtered.map((product) => (
              <button className={`product-tile ${!product.available ? "sold-out" : ""}`} key={product.id} onClick={() => openProduct(product)}>
                {product.popular && <span className="popular-tag">Popular</span>}
                <ProductMedia product={product} />
                <strong>{product.name}</strong>
                <small>{product.category}</small>
                <b>{currency} {product.price.toLocaleString()}</b>
                {!product.available && <i>Sold out</i>}
              </button>
            ))}
          </div>
        </section>
        <aside className="cart-panel panel">
          <div className="cart-head"><div><ShoppingCart size={18} /><h2>Current order</h2></div><button onClick={() => setCart([])}>Clear</button></div>
          <button type="button" className="order-customer" onClick={() => setPickingCustomer(true)}>
            <span>{(customer?.name ?? "Walk-in").slice(0, 1).toUpperCase()}</span>
            <div><strong>{customer?.name ?? "Walk-in customer"}</strong><small>{customer ? `${customer.points} loyalty pts` : "Add customer or loyalty"}</small></div>
            <ChevronRight size={16} />
          </button>
          <div className="cart-items">
            {cart.length === 0 ? <div className="empty-cart"><ShoppingCart size={28} /><strong>Your order is empty</strong><span>Select an item from the menu</span></div> : cart.map((item) => <div className="cart-item" key={item.id}><div className="cart-copy"><strong>{item.name}</strong><span>{item.modifiers.join(" · ") || "Standard"}</span><b>{currency} {(item.price * item.quantity).toLocaleString()}</b></div><div className="quantity-control"><button onClick={() => updateQuantity(item.id, -1)}>{item.quantity === 1 ? <Trash2 size={13} /> : <Minus size={13} />}</button><span>{item.quantity}</span><button onClick={() => updateQuantity(item.id, 1)}><Plus size={13} /></button></div></div>)}
          </div>
          {activeCampaigns.length > 0 && (
            <label className="cart-field">
              Active offer
              <select value={activeCampaignId} onChange={(e) => setActiveCampaignId(e.target.value)}>
                <option value="">No campaign</option>
                {activeCampaigns.map((campaign: Campaign) => (
                  <option key={campaign.id} value={campaign.id}>{campaign.title} · {campaign.offer}</option>
                ))}
              </select>
            </label>
          )}
          <div className="cart-summary">
            <div><span>Subtotal</span><b>{currency} {money.subtotal.toLocaleString()}</b></div>
            {money.serviceCharge > 0 && <div><span>Service ({Math.round(settings.serviceChargeRate * 100)}%)</span><b>{currency} {money.serviceCharge.toLocaleString()}</b></div>}
            <div><span>Tax</span><b>{currency} {money.tax.toLocaleString()}</b></div>
            <label className="cart-inline"><span>Discount</span><input type="number" min={0} value={discountInput} onChange={(e) => setDiscountInput(e.target.value)} placeholder="0" /></label>
            {campaignDiscount > 0 && <div><span>Campaign</span><b>−{currency} {campaignDiscount.toLocaleString()}</b></div>}
            {customer && (
              <label className="cart-inline">
                <span>Redeem pts (max {maxLoyaltyPoints})</span>
                <input type="number" min={0} max={maxLoyaltyPoints} value={pointsToRedeem} onChange={(e) => setPointsToRedeem(e.target.value)} placeholder="0" />
              </label>
            )}
            {loyaltyDiscount > 0 && <div><span>Loyalty</span><b>−{currency} {loyaltyDiscount.toLocaleString()}</b></div>}
            <label className="cart-inline"><span>Tip</span><input type="number" min={0} value={tipInput} onChange={(e) => setTipInput(e.target.value)} placeholder="0" /></label>
            <div className="cart-total"><span>Total</span><strong>{currency} {due.toLocaleString()}</strong></div>
            <button className="btn btn-primary checkout-btn" disabled={!cart.length} onClick={() => { setPaymentStep("choose"); setPaying(true); }}>Charge {currency} {due.toLocaleString()}<ChevronRight size={17} /></button>
          </div>
        </aside>
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Customize ${selected?.name ?? ""}`}>
        <div className="modifier-form">
          {activeModifierCatalog?.length ? activeModifierCatalog.map((group) => (
            <ModifierPicker
              key={group.id}
              title={group.name}
              options={group.options.map((option) => option.name)}
              selected={modifiers}
              setSelected={setModifiers}
              single={group.single}
            />
          )) : <p className="muted-copy">No customizations — base price only.</p>}
          <button className="btn btn-primary btn-full" onClick={addSelected}>
            Add to order · {currency} {((selected?.price ?? 0) + modifierExtraPrice(modifiers, activeModifierCatalog)).toLocaleString()}
          </button>
        </div>
      </Modal>

      <Modal open={pickingCustomer} onClose={() => setPickingCustomer(false)} title="Select customer">
        <div className="compact-list">
          <button type="button" className="compact-row" onClick={() => { setCustomer(null); setPickingCustomer(false); }}><strong>Walk-in</strong><span>No profile</span></button>
          {customers.map((entry) => (
            <button type="button" className="compact-row" key={entry.id} onClick={() => { setCustomer(entry); setPickingCustomer(false); }}>
              <strong>{entry.name}</strong>
              <span>{entry.segment}</span>
              <small>{entry.points} pts</small>
            </button>
          ))}
        </div>
      </Modal>

      <Modal open={paying} onClose={resetPaymentModal} title={paymentStep === "cash" ? "Cash payment" : paymentStep === "split" ? "Split payment" : "Take payment"}>
        <div className="payment-total"><span>Amount due</span><strong>{currency} {due.toLocaleString()}</strong></div>
        {paymentStep === "choose" && (
          <div className="payment-grid">
            <button type="button" onClick={() => void completePayment("Card")}><CreditCard /><strong>Card</strong><span>Tap or insert</span></button>
            <button type="button" onClick={() => setPaymentStep("cash")}><span className="payment-glyph">{currency.slice(0, 1)}</span><strong>Cash</strong><span>Tender & change</span></button>
            <button type="button" onClick={() => void completePayment("QR")}><span className="payment-glyph">▦</span><strong>QR pay</strong><span>Scan code</span></button>
            <button type="button" onClick={() => setPaymentStep("split")}><span className="payment-glyph">◫</span><strong>Split</strong><span>Cash + card</span></button>
          </div>
        )}
        {paymentStep === "cash" && (
          <div className="form-grid">
            <label className="span-2">Amount tendered<input type="number" min={0} value={amountTendered} onChange={(e) => setAmountTendered(e.target.value)} autoFocus /></label>
            <p>Change due: <strong>{currency} {Math.max(0, (Number(amountTendered) || 0) - due).toLocaleString()}</strong></p>
            <button type="button" className="btn btn-primary btn-full" onClick={confirmCashPayment}>Complete cash sale</button>
            <button type="button" className="btn btn-secondary btn-full" onClick={() => setPaymentStep("choose")}>Back</button>
          </div>
        )}
        {paymentStep === "split" && (
          <div className="form-grid">
            <label>Cash portion<input type="number" min={0} value={splitCash} onChange={(e) => setSplitCash(e.target.value)} /></label>
            <label>Card portion<input type="number" min={0} value={splitCard} onChange={(e) => setSplitCard(e.target.value)} /></label>
            <p>Total: <strong>{currency} {(Number(splitCash) || 0) + (Number(splitCard) || 0)}</strong> (need {currency} {due.toLocaleString()})</p>
            <button type="button" className="btn btn-primary btn-full" onClick={confirmSplitPayment}>Complete split sale</button>
            <button type="button" className="btn btn-secondary btn-full" onClick={() => setPaymentStep("choose")}>Back</button>
          </div>
        )}
      </Modal>

      <Modal open={!!lastOrder} onClose={() => setLastOrder(null)} title="Receipt" wide>
        {lastOrder && (
          <div className="receipt-print">
            <header><strong>{branch.name}</strong><small>{new Date(lastOrder.placedAtIso).toLocaleString()}</small></header>
            <h3>Order {lastOrder.number}</h3>
            <p>{lastOrder.customer} · {lastOrder.type}</p>
            <ul className="receipt-lines">
              {lastOrder.lines.map((line, index) => (
                <li key={`${lastOrder.id}-${index}`}>
                  <span>{line.quantity}× {line.name}</span>
                  <b>{currency} {(line.price * line.quantity).toLocaleString()}</b>
                  {line.modifiers?.length ? <small>{line.modifiers.join(" · ")}</small> : null}
                </li>
              ))}
            </ul>
            <dl className="receipt-totals">
              <div><dt>Subtotal</dt><dd>{currency} {lastOrder.subtotal.toLocaleString()}</dd></div>
              {lastOrder.serviceCharge > 0 && <div><dt>Service</dt><dd>{currency} {lastOrder.serviceCharge.toLocaleString()}</dd></div>}
              <div><dt>Tax</dt><dd>{currency} {lastOrder.tax.toLocaleString()}</dd></div>
              {lastOrder.discount > 0 && <div><dt>Discount</dt><dd>−{currency} {lastOrder.discount.toLocaleString()}</dd></div>}
              {lastOrder.tip > 0 && <div><dt>Tip</dt><dd>{currency} {lastOrder.tip.toLocaleString()}</dd></div>}
              <div><dt>Total</dt><dd><strong>{currency} {lastOrder.total.toLocaleString()}</strong></dd></div>
              <div><dt>Payment</dt><dd>{lastOrder.paymentMethod}</dd></div>
              {typeof lastOrder.amountTendered === "number" && <div><dt>Tendered</dt><dd>{currency} {lastOrder.amountTendered.toLocaleString()}</dd></div>}
              {typeof lastOrder.changeDue === "number" && lastOrder.changeDue > 0 && <div><dt>Change</dt><dd>{currency} {lastOrder.changeDue.toLocaleString()}</dd></div>}
            </dl>
            <div className="receipt-actions no-print">
              <button type="button" className="btn btn-secondary" onClick={() => window.print()}>Print receipt</button>
              <button type="button" className="btn btn-primary" onClick={() => setLastOrder(null)}>Start next order</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function ModifierPicker({ title, options, selected, setSelected, single = false }: { title: string; options: string[]; selected: string[]; setSelected: (items: string[]) => void; single?: boolean }) {
  const toggle = (option: string) => {
    if (single) {
      const withoutGroup = selected.filter((item) => !options.includes(item));
      setSelected(selected.includes(option) ? withoutGroup : [...withoutGroup, option]);
    } else setSelected(selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option]);
  };
  return <div className="modifier-group"><h3>{title}</h3><div>{options.map((option) => <button className={selected.includes(option) ? "active" : ""} key={option} onClick={() => toggle(option)}>{option}{selected.includes(option) && <Check size={14} />}</button>)}</div></div>;
}

export function OrdersModule({ toast }: { toast: ToastFn }) {
  const { orders, settings, advanceOrder, refundOrder } = useApp();
  const currency = settings.currency;
  const [view, setView] = useState<"list" | "kds">("kds");
  const [filter, setFilter] = useState("All");
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const shown = orders.filter((order) => filter === "All" || order.status === filter);
  const activeCount = orders.filter((order) => order.status !== "Completed" && order.status !== "Refunded").length;
  const nextLabel: Record<string, string> = { Received: "Start", Preparing: "Mark ready", Ready: "Complete", Completed: "Completed", Refunded: "Refunded" };

  async function advance(id: string, number: string) {
    try {
      await advanceOrder(id);
      toast(`${number} status updated`);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not update order");
    }
  }

  async function refund(id: string, number: string) {
    if (!window.confirm(`Refund ${number}?`)) return;
    try {
      await refundOrder(id);
      toast(`${number} refunded`);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not refund order");
    }
  }

  return <div className="module-page">
    <SectionHeader title="Orders" description={`${activeCount} active orders across all channels`} actions={<div className="segmented"><button className={view === "kds" ? "active" : ""} onClick={() => setView("kds")}>KDS board</button><button className={view === "list" ? "active" : ""} onClick={() => setView("list")}>Order list</button></div>} />
    <div className="filter-row">{["All", "Received", "Preparing", "Ready", "Completed", "Refunded"].map((status) => <button className={filter === status ? "active" : ""} key={status} onClick={() => setFilter(status)}>{status}<span>{status === "All" ? orders.length : orders.filter((order) => order.status === status).length}</span></button>)}</div>
    {orders.length === 0 ? (
      <div className="placeholder-panel panel"><ReceiptEmpty /><h2>No orders yet</h2><p>Completed POS sales will appear here for fulfillment.</p></div>
    ) : view === "kds" ? (
      <div className="kds-board">{["Received", "Preparing", "Ready"].map((status) => <section className="kds-column" key={status}><div className="kds-head"><div><i className={`kds-dot ${status.toLowerCase()}`} /><strong>{status}</strong></div><span>{orders.filter((order) => order.status === status).length}</span></div>{orders.filter((order) => order.status === status).map((order) => <article className="kds-ticket" key={order.id}><div><strong>{order.number}</strong><StatusBadge tone={order.type}>{order.type}</StatusBadge></div><h3>{order.customer}</h3><ul className="kds-lines">{(order.lines?.length ? order.lines : [{ name: `${order.items} items`, quantity: order.items, modifiers: [] as string[], price: 0, productId: null }]).map((line, index) => <li key={`${order.id}-${index}`}><strong>{line.quantity}× {line.name}</strong>{line.modifiers?.length ? <small>{line.modifiers.join(" · ")}</small> : null}</li>)}</ul><footer><span><Clock3 size={13} />{order.placedAt}</span><button onClick={() => advance(order.id, order.number)}>{nextLabel[order.status]}<ChevronRight size={14} /></button></footer></article>)}</section>)}</div>
    ) : (
      <div className="data-table panel"><div className="table-head"><span>Order</span><span>Customer</span><span>Channel</span><span>Items</span><span>Total</span><span>Status</span><span /></div>{shown.map((order) => <div className="table-row" key={order.id}><button type="button" className="linkish" onClick={() => setDetailOrder(order)}><strong>{order.number}</strong></button><span>{order.customer}</span><span>{order.type}</span><span>{order.items}</span><b>{currency} {order.total.toLocaleString()}</b><StatusBadge tone={order.status}>{order.status}</StatusBadge><span>{order.status !== "Completed" && order.status !== "Refunded" ? <button onClick={() => advance(order.id, order.number)}>{nextLabel[order.status]}</button> : null}{order.status !== "Refunded" ? <button onClick={() => void refund(order.id, order.number)}>Refund</button> : null}</span></div>)}</div>
    )}

    <Modal open={!!detailOrder} onClose={() => setDetailOrder(null)} title={detailOrder ? `Order ${detailOrder.number}` : "Order"} wide>
      {detailOrder && (
        <div className="order-detail">
          <p>{detailOrder.customer} · {detailOrder.type} · {detailOrder.paymentMethod}</p>
          <ul className="receipt-lines">
            {detailOrder.lines.map((line, index) => (
              <li key={`${detailOrder.id}-line-${index}`}><span>{line.quantity}× {line.name}</span><b>{currency} {(line.price * line.quantity).toLocaleString()}</b></li>
            ))}
          </ul>
          <dl className="receipt-totals">
            <div><dt>Subtotal</dt><dd>{currency} {detailOrder.subtotal.toLocaleString()}</dd></div>
            {detailOrder.serviceCharge > 0 && <div><dt>Service charge</dt><dd>{currency} {detailOrder.serviceCharge.toLocaleString()}</dd></div>}
            <div><dt>Tax</dt><dd>{currency} {detailOrder.tax.toLocaleString()}</dd></div>
            {detailOrder.discount > 0 && <div><dt>Discount</dt><dd>−{currency} {detailOrder.discount.toLocaleString()}</dd></div>}
            {detailOrder.tip > 0 && <div><dt>Tip</dt><dd>{currency} {detailOrder.tip.toLocaleString()}</dd></div>}
            <div><dt>Total</dt><dd><strong>{currency} {detailOrder.total.toLocaleString()}</strong></dd></div>
          </dl>
        </div>
      )}
    </Modal>
  </div>;
}

function ReceiptEmpty() {
  return <Clock3 size={28} />;
}

const emptyProductForm = {
  name: "",
  category: "Coffee",
  customCategory: "",
  price: "850",
  cost: "280",
  emoji: "☕",
  imageUrl: "",
  description: "",
  available: true,
  popular: false,
};

function recipeCostFromStock(lines: RecipeLine[], stock: StockItem[]) {
  return Math.round(
    lines.reduce((sum, line) => {
      const item = stock.find((entry) => entry.id === line.stockId);
      if (!item) return sum;
      return sum + recipeLineCost(stockUnitCost(item), line.quantity);
    }, 0),
  );
}

export function MenuModule({ toast }: { toast: ToastFn }) {
  const {
    products,
    settings,
    stock,
    recipes,
    modifierGroups,
    toggleProduct,
    createProduct,
    updateProduct,
    removeProduct,
    saveSettings,
    saveRecipe,
    removeRecipe,
    createModifierGroup,
    updateModifierGroup,
    removeModifierGroup,
  } = useApp();
  const currency = settings.currency;
  const [tab, setTab] = useState("Products");
  const [productModal, setProductModal] = useState<"add" | Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [categoryMode, setCategoryMode] = useState<"preset" | "custom">("preset");
  const [form, setForm] = useState(emptyProductForm);
  const [modifierGroupIds, setModifierGroupIds] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [recipeProductId, setRecipeProductId] = useState("");
  const [recipeLines, setRecipeLines] = useState<RecipeLine[]>([]);
  const [recipeNotes, setRecipeNotes] = useState("");
  const [modifierModal, setModifierModal] = useState<"add" | ModifierGroupDef | null>(null);
  const [modifierForm, setModifierForm] = useState({ name: "", single: true, optionsText: "Small|0\nLarge|100", appliesTo: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categoryOptions = useMemo(() => {
    const fromSettings = settings.categories ?? [];
    const fromProducts = products.map((product) => product.category).filter(Boolean);
    return [...new Set([...fromSettings, ...PRODUCT_CATEGORIES, ...fromProducts])];
  }, [products, settings.categories]);

  const activeRecipeProductId = recipeProductId || products[0]?.id || "";
  const selectedRecipeProduct = products.find((product) => product.id === activeRecipeProductId);

  useEffect(() => {
    if (!activeRecipeProductId) return;
    const existing = recipes.find((recipe) => recipe.productId === activeRecipeProductId);
    setRecipeLines(existing?.lines ?? []);
    setRecipeNotes(existing?.notes ?? "");
  }, [activeRecipeProductId, recipes]);

  const selectedCategory = categoryMode === "custom" ? form.customCategory.trim() : form.category;
  const priceValue = Number(form.price) || 0;
  const costValue = Number(form.cost) || 0;
  const margin = priceValue > 0 ? Math.round((1 - costValue / priceValue) * 100) : 0;
  const emojiChoices = CATEGORY_EMOJI[selectedCategory] || CATEGORY_EMOJI.Other;

  function openCreate() {
    setForm(emptyProductForm);
    setModifierGroupIds([]);
    setCategoryMode("preset");
    setProductModal("add");
  }

  function openEdit(product: Product) {
    setModifierGroupIds(product.modifierGroupIds ?? []);
    setForm({
      name: product.name,
      category: product.category,
      customCategory: "",
      price: String(product.price),
      cost: String(product.cost),
      emoji: product.emoji,
      imageUrl: product.imageUrl ?? "",
      description: product.description ?? "",
      available: product.available,
      popular: Boolean(product.popular),
    });
    const preset = categoryOptions.includes(product.category);
    setCategoryMode(preset ? "preset" : "custom");
    if (!preset) setForm((current) => ({ ...current, customCategory: product.category }));
    setProductModal(product);
  }

  function closeProductModal() {
    if (saving) return;
    setProductModal(null);
  }

  function parseModifierOptions(text: string) {
    return text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [name, priceRaw] = line.split("|");
        return { name: (name ?? "").trim(), price: Number(priceRaw) || 0 };
      })
      .filter((option) => option.name);
  }

  async function saveCategoriesList(next: string[]) {
    if (!next.length) {
      toast("Keep at least one category");
      return;
    }
    try {
      await saveSettings({ categories: next });
      toast("Categories updated");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not update categories");
    }
  }

  async function saveModifierGroup() {
    const options = parseModifierOptions(modifierForm.optionsText);
    if (!modifierForm.name.trim() || !options.length) {
      toast("Name and at least one option are required");
      return;
    }
    const appliesTo = modifierForm.appliesTo.split(",").map((value) => value.trim()).filter(Boolean);
    try {
      if (modifierModal === "add") {
        await createModifierGroup({ name: modifierForm.name.trim(), single: modifierForm.single, options, appliesTo });
        toast("Modifier group created");
      } else if (modifierModal) {
        await updateModifierGroup(modifierModal.id, { name: modifierForm.name.trim(), single: modifierForm.single, options, appliesTo });
        toast("Modifier group updated");
      }
      setModifierModal(null);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not save modifier group");
    }
  }

  async function saveRecipeForProduct() {
    if (!selectedRecipeProduct) return;
    try {
      await saveRecipe({ productId: selectedRecipeProduct.id, lines: recipeLines, notes: recipeNotes.trim() || undefined });
      toast("Recipe saved · product cost updated");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not save recipe");
    }
  }

  function addRecipeLine() {
    const firstStock = stock[0];
    if (!firstStock) {
      toast("Add stock items in Inventory first");
      return;
    }
    setRecipeLines((current) => [...current, { stockId: firstStock.id, quantity: 1 }]);
  }

  function onCategoryChange(value: string) {
    if (value === "__custom__") {
      setCategoryMode("custom");
      setForm((current) => ({
        ...current,
        customCategory: "",
        emoji: current.imageUrl ? current.emoji : DEFAULT_CATEGORY_EMOJI.Other,
      }));
      return;
    }
    setCategoryMode("preset");
    setForm((current) => ({
      ...current,
      category: value,
      emoji: current.imageUrl ? current.emoji : (DEFAULT_CATEGORY_EMOJI[value] || current.emoji),
    }));
  }

  async function onImageSelected(file?: File | null) {
    if (!file) return;
    try {
      const imageUrl = await fileToProductImage(file);
      setForm((current) => ({ ...current, imageUrl }));
      toast("Image ready");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not process image");
    }
  }

  async function submitProduct() {
    const category = selectedCategory;
    if (!form.name.trim()) {
      toast("Product name is required");
      return;
    }
    if (!category) {
      toast("Choose or enter a category");
      return;
    }
    if (!Number.isFinite(priceValue) || priceValue < 0) {
      toast("Enter a valid price");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        category,
        price: priceValue,
        cost: costValue,
        emoji: form.emoji || DEFAULT_CATEGORY_EMOJI[category] || "C",
        imageUrl: form.imageUrl || undefined,
        description: form.description.trim() || undefined,
        available: form.available,
        popular: form.popular,
        modifierGroupIds,
      };
      if (productModal === "add") {
        await createProduct(payload);
        toast("Product created");
      } else if (productModal) {
        await updateProduct(productModal.id, payload);
        toast("Product updated");
      }
      setProductModal(null);
      setForm(emptyProductForm);
      setCategoryMode("preset");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not save product");
    } finally {
      setSaving(false);
    }
  }

  return <div className="module-page">
    <SectionHeader title="Menu & recipes" description={`${products.length} products · ${products.filter((p) => p.available).length} available`} actions={<button className="btn btn-primary" onClick={openCreate}><Plus size={15} />Add product</button>} />
    <div className="module-tabs">{["Products", "Categories", "Modifiers", "Recipes", "Profitability"].map((item) => <button className={tab === item ? "active" : ""} onClick={() => setTab(item)} key={item}>{item}</button>)}</div>
    {tab === "Products" && (
      products.length === 0 ? (
        <div className="placeholder-panel panel"><UtensilsCrossed size={28} /><h2>No menu items</h2><p>Create your first product with a category, price, and optional photo.</p><button className="btn btn-primary" onClick={openCreate}>Add product</button></div>
      ) : (
        <div className="data-table menu-table panel"><div className="table-head"><span>Product</span><span>Category</span><span>Price</span><span>Cost</span><span>Margin</span><span>Available</span><span /></div>{products.map((product) => <div className="table-row" key={product.id}><div className="name-cell"><ProductMedia product={product} className="table-media" /><div><strong>{product.name}</strong><small>{product.popular ? "Popular item" : product.description || "Standard item"}</small></div></div><span>{product.category}</span><b>{currency} {product.price.toLocaleString()}</b><span>{currency} {product.cost.toLocaleString()}</span><strong className={product.price > 0 && (1 - product.cost / product.price) > .6 ? "success-text" : "warning-text"}>{product.price > 0 ? `${Math.round((1 - product.cost / product.price) * 100)}%` : "—"}</strong><button className={`toggle ${product.available ? "on" : ""}`} onClick={() => toggleProduct(product.id)}><i /></button><button onClick={() => openEdit(product)}><Pencil size={14} /></button></div>)}</div>
      )
    )}
    {tab === "Categories" && (
      <article className="panel settings-panel">
        <div className="settings-title"><h2>Menu categories</h2><p>Categories appear in POS filters and product composer.</p></div>
        <div className="form-grid">
          <label className="span-2">Add category<input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Seasonal specials" /></label>
        </div>
        <button className="btn btn-secondary" onClick={() => { if (!newCategory.trim()) return; void saveCategoriesList([...settings.categories, newCategory.trim()]); setNewCategory(""); }}>Add category</button>
        <div className="data-table">
          <div className="table-head"><span>Category</span><span /></div>
          {settings.categories.map((category) => (
            <div className="table-row" key={category}>
              <strong>{category}</strong>
              <button onClick={() => void saveCategoriesList(settings.categories.filter((entry) => entry !== category))}>Remove</button>
            </div>
          ))}
        </div>
      </article>
    )}
    {tab === "Modifiers" && (
      <>
        <SectionHeader title="" description="" actions={<button className="btn btn-primary" onClick={() => { setModifierForm({ name: "", single: true, optionsText: "Small|0\nLarge|100", appliesTo: "" }); setModifierModal("add"); }}><Plus size={15} />Add modifier group</button>} />
        {modifierGroups.length === 0 ? (
          <div className="placeholder-panel panel"><h2>No modifier groups</h2><p>Create size, milk, or topping groups for POS customization.</p></div>
        ) : (
          <div className="data-table panel">
            <div className="table-head"><span>Group</span><span>Options</span><span>Applies to</span><span /></div>
            {modifierGroups.map((group) => (
              <div className="table-row" key={group.id}>
                <strong>{group.name}{group.single ? " · single" : ""}</strong>
                <span>{group.options.map((option) => `${option.name} (+${option.price})`).join(", ")}</span>
                <span>{group.appliesTo.join(", ") || "All (via product link)"}</span>
                <span>
                  <button onClick={() => { setModifierForm({ name: group.name, single: group.single, optionsText: group.options.map((option) => `${option.name}|${option.price}`).join("\n"), appliesTo: group.appliesTo.join(", ") }); setModifierModal(group); }}>Edit</button>
                  <button onClick={() => void removeModifierGroup(group.id).then(() => toast("Modifier group removed")).catch((error) => toast(error instanceof Error ? error.message : "Could not remove"))}>Remove</button>
                </span>
              </div>
            ))}
          </div>
        )}
      </>
    )}
    {tab === "Recipes" && (
      products.length === 0 ? (
        <div className="placeholder-panel panel"><UtensilsCrossed size={28} /><h2>No recipes yet</h2><p>Recipes will attach to products once you add menu items.</p></div>
      ) : (
        <div className="recipe-layout">
          <div className="panel recipe-list">
            {products.map((product) => (
              <button className={product.id === activeRecipeProductId ? "active" : ""} key={product.id} onClick={() => setRecipeProductId(product.id)}>
                <ProductMedia product={product} className="list-media" />
                <div><strong>{product.name}</strong><small>{recipes.some((recipe) => recipe.productId === product.id) ? "Recipe on file" : "No recipe yet"}</small></div>
                <ChevronRight size={15} />
              </button>
            ))}
          </div>
          <article className="panel recipe-detail">
            <div className="panel-head"><div><p>Recipe</p><h2>{selectedRecipeProduct?.name}</h2></div><button className="btn btn-secondary" onClick={addRecipeLine}><Plus size={15} />Add line</button></div>
            {stock.length === 0 ? <p>Add stock in Inventory to build recipe lines.</p> : (
              <div className="data-table">
                <div className="table-head"><span>Ingredient</span><span>Quantity</span><span /></div>
                {recipeLines.map((line, index) => (
                  <div className="table-row" key={`${line.stockId}-${index}`}>
                    <select value={line.stockId} onChange={(e) => setRecipeLines((current) => current.map((entry, i) => i === index ? { ...entry, stockId: e.target.value } : entry))}>
                      {stock.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
                    </select>
                    <input type="number" min={0} step={0.01} value={line.quantity} onChange={(e) => setRecipeLines((current) => current.map((entry, i) => i === index ? { ...entry, quantity: Number(e.target.value) || 0 } : entry))} />
                    <button onClick={() => setRecipeLines((current) => current.filter((_, i) => i !== index))}><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            )}
            <label className="span-2">Notes<textarea rows={2} value={recipeNotes} onChange={(e) => setRecipeNotes(e.target.value)} /></label>
            <p>Estimated COGS: <strong>{currency} {recipeCostFromStock(recipeLines, stock).toLocaleString()}</strong></p>
            <div className="product-image-actions">
              <button className="btn btn-primary" onClick={() => void saveRecipeForProduct()}>Save recipe</button>
              {recipes.some((recipe) => recipe.productId === activeRecipeProductId) && selectedRecipeProduct ? (
                <button className="btn btn-secondary" type="button" onClick={() => void removeRecipe(selectedRecipeProduct.id).then(() => { setRecipeLines([]); setRecipeNotes(""); toast("Recipe cleared"); }).catch((error) => toast(error instanceof Error ? error.message : "Could not clear recipe"))}>Clear recipe</button>
              ) : null}
            </div>
          </article>
        </div>
      )
    )}
    {tab === "Profitability" && (products.length ? <Profitability products={products} currency={currency} /> : <div className="placeholder-panel panel"><h2>No profitability data</h2><p>Add products with price and cost to see margins.</p></div>)}

    <Modal open={!!modifierModal} onClose={() => setModifierModal(null)} title={modifierModal === "add" ? "Add modifier group" : "Edit modifier group"} wide>
      <div className="form-grid">
        <label className="span-2">Name<input value={modifierForm.name} onChange={(e) => setModifierForm({ ...modifierForm, name: e.target.value })} /></label>
        <label><span className="check-row"><input type="checkbox" checked={modifierForm.single} onChange={(e) => setModifierForm({ ...modifierForm, single: e.target.checked })} />Single choice</span></label>
        <label className="span-2">Options (one per line: Name|price)<textarea rows={4} value={modifierForm.optionsText} onChange={(e) => setModifierForm({ ...modifierForm, optionsText: e.target.value })} /></label>
        <label className="span-2">Applies to (product ids or categories, comma-separated)<input value={modifierForm.appliesTo} onChange={(e) => setModifierForm({ ...modifierForm, appliesTo: e.target.value })} /></label>
      </div>
      <button className="btn btn-primary btn-full" onClick={() => void saveModifierGroup()}>Save modifier group</button>
    </Modal>

    <Modal open={!!productModal} onClose={closeProductModal} title={productModal === "add" ? "Add product" : "Edit product"} wide>
      <div className="product-composer">
        <div className="product-composer-main">
          <div className="product-image-field">
            <button type="button" className={`product-image-drop ${form.imageUrl ? "has-image" : ""}`} onClick={() => fileInputRef.current?.click()}>
              {form.imageUrl ? (
                <img src={form.imageUrl} alt="Product preview" />
              ) : (
                <>
                  <ImagePlus size={28} />
                  <strong>Upload product photo</strong>
                  <span>JPG, PNG or WebP · auto-resized</span>
                </>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              onChange={(event) => {
                void onImageSelected(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            <div className="product-image-actions">
              <button type="button" className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}><Upload size={15} />{form.imageUrl ? "Replace photo" : "Choose photo"}</button>
              {form.imageUrl && <button type="button" className="btn btn-secondary" onClick={() => setForm((current) => ({ ...current, imageUrl: "" }))}><X size={15} />Remove</button>}
            </div>
          </div>

          <div className="form-grid product-form-grid">
            <label className="span-2">Product name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Iced Latte" autoFocus /></label>
            <label>
              Category
              <select
                value={categoryMode === "custom" ? "__custom__" : form.category}
                onChange={(e) => onCategoryChange(e.target.value)}
              >
                {categoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}
                <option value="__custom__">Custom category…</option>
              </select>
            </label>
            {categoryMode === "custom" && (
              <label className="span-2">Custom category<input value={form.customCategory} onChange={(e) => setForm({ ...form, customCategory: e.target.value })} placeholder="Seasonal specials" /></label>
            )}
            <label className="span-2">
              Display icon
              <div className="emoji-picker">
                {emojiChoices.map((emoji) => (
                  <button type="button" key={emoji} className={form.emoji === emoji ? "active" : ""} onClick={() => setForm({ ...form, emoji })}>{emoji}</button>
                ))}
              </div>
            </label>
            <label>Price ({currency})<input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} type="number" min="0" step="1" /></label>
            <label>Cost ({currency})<input value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} type="number" min="0" step="1" /></label>
            {modifierGroups.length > 0 && (
              <fieldset className="span-2 modifier-group-picker">
                <legend>Modifier groups</legend>
                {modifierGroups.map((group) => (
                  <label key={group.id} className="check-row">
                    <input
                      type="checkbox"
                      checked={modifierGroupIds.includes(group.id)}
                      onChange={(e) => setModifierGroupIds((current) => e.target.checked ? [...current, group.id] : current.filter((id) => id !== group.id))}
                    />
                    <span>{group.name}</span>
                  </label>
                ))}
              </fieldset>
            )}
            <label className="span-2">Description<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Short menu description shown to staff and guests" rows={3} /></label>
          </div>

          <div className="product-toggles">
            <label className="check-row"><input type="checkbox" checked={form.available} onChange={(e) => setForm({ ...form, available: e.target.checked })} /><span><strong>Available for sale</strong><small>Hidden from POS when off</small></span></label>
            <label className="check-row"><input type="checkbox" checked={form.popular} onChange={(e) => setForm({ ...form, popular: e.target.checked })} /><span><strong>Mark as popular</strong><small>Highlights the item in the menu</small></span></label>
          </div>
        </div>

        <aside className="product-preview-card panel">
          <p>Live preview</p>
          <div className={`product-tile preview-tile ${form.available ? "" : "sold-out"}`}>
            {form.popular && <span className="popular-tag">Popular</span>}
            <ProductMedia product={{ name: form.name || "New product", emoji: form.emoji, imageUrl: form.imageUrl || undefined }} />
            <strong>{form.name.trim() || "Product name"}</strong>
            <small>{selectedCategory || "Category"}</small>
            <b>{currency} {priceValue.toLocaleString()}</b>
            {!form.available && <i>Sold out</i>}
          </div>
          <dl>
            <div><dt>Gross profit</dt><dd>{currency} {Math.max(0, priceValue - costValue).toLocaleString()}</dd></div>
            <div><dt>Margin</dt><dd className={margin >= 60 ? "success-text" : "warning-text"}>{priceValue > 0 ? `${margin}%` : "—"}</dd></div>
          </dl>
          <button className="btn btn-primary btn-full" disabled={saving || !form.name.trim() || !selectedCategory} onClick={() => void submitProduct()}>
            {saving ? "Saving…" : productModal === "add" ? "Create product" : "Save product"}
          </button>
          {productModal && productModal !== "add" ? (
            <button className="btn btn-secondary btn-full" onClick={() => void removeProduct(productModal.id).then(() => { setProductModal(null); toast("Product removed"); }).catch((error) => toast(error instanceof Error ? error.message : "Could not remove"))}>Remove product</button>
          ) : null}
        </aside>
      </div>
    </Modal>
  </div>;
}

function Profitability({ products, currency }: { products: Product[]; currency: string }) {
  return <div className="profit-grid">{products.slice(0, 8).map((product) => { const margin = product.price > 0 ? Math.round((1 - product.cost / product.price) * 100) : 0; return <article className="panel profit-card" key={product.id}><ProductMedia product={product} className="profit-media" /><div><strong>{product.name}</strong><small>{product.category}</small></div><div className="margin-ring" style={{ "--margin": `${margin * 3.6}deg` } as React.CSSProperties}><b>{margin}%</b></div><footer><span>Profit / item</span><strong>{currency} {(product.price - product.cost).toLocaleString()}</strong></footer></article>; })}</div>;
}

const emptyStockForm: { name: string; category: string; unit: string; quantity: string; minimum: string; value: string; supplier: string; trend: string } = {
  name: "",
  category: STOCK_CATEGORIES[0],
  unit: STOCK_UNITS[0],
  quantity: "0",
  minimum: "0",
  value: "0",
  supplier: "",
  trend: "0",
};

export function InventoryModule({ toast }: { toast: ToastFn }) {
  const {
    stock,
    settings,
    waste,
    ledger,
    purchaseOrders,
    adjustStock,
    createStockItem,
    updateStockItem,
    removeStockItem,
    recordWaste,
    createPurchaseOrder,
    updatePurchaseOrder,
  } = useApp();
  const currency = settings.currency;
  const [tab, setTab] = useState("Stock");
  const [adjusting, setAdjusting] = useState<string | null>(null);
  const [countQty, setCountQty] = useState("");
  const [stockModal, setStockModal] = useState<"add" | StockItem | null>(null);
  const [stockForm, setStockForm] = useState(emptyStockForm);
  const [wasteForm, setWasteForm] = useState({ stockId: "", quantity: "1", reason: "Expired" });
  const [poSupplier, setPoSupplier] = useState("");
  const [poLines, setPoLines] = useState<{ stockId: string; quantity: string; unitCost: string }[]>([]);
  const item = stock.find((entry) => entry.id === adjusting);
  const inventoryValue = stock.reduce((sum, entry) => sum + stockInventoryValue(entry), 0);
  const wasteValue = waste.reduce((sum, entry) => {
    const item = stock.find((stockItem) => stockItem.id === entry.stockId);
    return sum + (item ? recipeLineCost(stockUnitCost(item), entry.quantity) : 0);
  }, 0);
  const lowCount = stock.filter((i) => i.quantity < i.minimum).length;
  const openPos = purchaseOrders.filter((po) => po.status !== "Received").length;
  const suppliers = [...new Set(stock.map((entry) => entry.supplier).filter(Boolean))];

  function openAddStock() {
    setStockForm(emptyStockForm);
    setStockModal("add");
  }

  function openEditStock(entry: StockItem) {
    setStockForm({
      name: entry.name,
      category: entry.category,
      unit: entry.unit,
      quantity: String(entry.quantity),
      minimum: String(entry.minimum),
      value: String(entry.value),
      supplier: entry.supplier,
      trend: String(entry.trend),
    });
    setStockModal(entry);
  }

  async function saveStockItem() {
    if (!stockForm.name.trim()) {
      toast("Name is required");
      return;
    }
    const payload = {
      name: stockForm.name.trim(),
      category: stockForm.category,
      unit: stockForm.unit,
      quantity: Number(stockForm.quantity) || 0,
      minimum: Number(stockForm.minimum) || 0,
      value: Number(stockForm.value) || 0,
      supplier: stockForm.supplier.trim(),
      trend: Number(stockForm.trend) || 0,
    };
    try {
      if (stockModal === "add") {
        await createStockItem(payload);
        toast("Stock item added");
      } else if (stockModal) {
        await updateStockItem(stockModal.id, payload);
        toast("Stock item updated");
      }
      setStockModal(null);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not save stock item");
    }
  }

  async function submitCount() {
    if (!item) return;
    const quantity = Number(countQty);
    if (!Number.isFinite(quantity) || quantity < 0) {
      toast("Enter a valid counted quantity");
      return;
    }
    try {
      await adjustStock(item.id, undefined, quantity, "Physical count");
      setAdjusting(null);
      setCountQty("");
      toast("Count saved");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not save count");
    }
  }

  async function submitWaste() {
    const quantity = Number(wasteForm.quantity);
    if (!wasteForm.stockId || !Number.isFinite(quantity) || quantity <= 0) {
      toast("Choose stock and a positive quantity");
      return;
    }
    try {
      await recordWaste({ stockId: wasteForm.stockId, quantity, reason: wasteForm.reason.trim() || "Waste" });
      setWasteForm({ stockId: "", quantity: "1", reason: "Expired" });
      toast("Waste recorded");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not record waste");
    }
  }

  function addPoLine() {
    const first = stock[0];
    if (!first) {
      toast("Add stock items first");
      return;
    }
    setPoLines((current) => [...current, { stockId: first.id, quantity: "1", unitCost: "0" }]);
  }

  async function submitPurchaseOrder() {
    if (!poSupplier.trim() || !poLines.length) {
      toast("Supplier and at least one line are required");
      return;
    }
    const lines = poLines.map((line) => {
      const stockItem = stock.find((entry) => entry.id === line.stockId);
      return {
        stockId: line.stockId,
        name: stockItem?.name ?? "Item",
        quantity: Number(line.quantity) || 0,
        unitCost: Number(line.unitCost) || 0,
      };
    });
    if (lines.some((line) => line.quantity <= 0)) {
      toast("Each line needs a positive quantity");
      return;
    }
    try {
      await createPurchaseOrder({ supplier: poSupplier.trim(), lines, status: "Draft" });
      setPoSupplier("");
      setPoLines([]);
      toast("Purchase order created");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not create PO");
    }
  }

  return (
    <div className="module-page">
      <SectionHeader
        title="Inventory"
        description="Real-time ingredient and packaging stock"
        actions={
          <>
            <button className="btn btn-secondary" onClick={openAddStock}><Plus size={15} />Add stock</button>
            <button className="btn btn-secondary" disabled={!stock.length} onClick={() => stock[0] && setAdjusting(stock[0].id)}><PackageCheck size={15} />Start count</button>
          </>
        }
      />
      <div className="metric-grid mini">
        <article className="metric-card plain"><p>Inventory value</p><strong>{currency} {inventoryValue.toLocaleString()}</strong><small>Across {stock.length} tracked items</small></article>
        <article className="metric-card plain"><p>Low stock</p><strong>{lowCount}</strong><small>{lowCount ? "Action recommended" : "All healthy"}</small></article>
        <article className="metric-card plain"><p>Waste (est.)</p><strong>{currency} {wasteValue.toLocaleString()}</strong><small>{waste.length} logged entries</small></article>
        <article className="metric-card plain"><p>Open POs</p><strong>{openPos}</strong><small>{purchaseOrders.length} total</small></article>
      </div>
      <div className="module-tabs">{["Stock", "Purchase orders", "Suppliers", "Waste", "Stock ledger"].map((value) => <button className={tab === value ? "active" : ""} key={value} onClick={() => setTab(value)}>{value}</button>)}</div>

      {tab === "Stock" && (
        stock.length === 0 ? (
          <div className="placeholder-panel panel"><PackageCheck size={28} /><h2>No stock items</h2><p>Add ingredients and packaging to track on-hand levels.</p><button className="btn btn-primary" onClick={openAddStock}>Add stock</button></div>
        ) : (
          <div className="data-table inventory-table panel">
            <div className="table-head"><span>Ingredient</span><span>On hand</span><span>Minimum</span><span>Supplier</span><span>Cost trend</span><span>Status</span><span /></div>
            {stock.map((entry) => {
              const low = entry.quantity < entry.minimum;
              return (
                <div className="table-row" key={entry.id}>
                  <div className="name-cell"><span className={low ? "stock-icon low" : "stock-icon"}>{entry.name[0]}</span><div><strong>{entry.name}</strong><small>{entry.category}</small></div></div>
                  <strong>{entry.quantity} {entry.unit}</strong>
                  <span>{entry.minimum} {entry.unit}</span>
                  <span>{entry.supplier || "—"}</span>
                  <b className={entry.trend > 4 ? "danger-text" : ""}>{entry.trend > 0 ? "↗" : entry.trend < 0 ? "↘" : "—"} {Math.abs(entry.trend)}%</b>
                  <StatusBadge tone={low ? "low" : "healthy"}>{low ? "Low stock" : "Healthy"}</StatusBadge>
                  <span><button onClick={() => setAdjusting(entry.id)}>Adjust</button><button onClick={() => openEditStock(entry)}>Edit</button></span>
                </div>
              );
            })}
          </div>
        )
      )}

      {tab === "Purchase orders" && (
        <>
          <article className="panel settings-panel">
            <div className="settings-title"><h2>Create purchase order</h2></div>
            <div className="form-grid">
              <label className="span-2">Supplier<input value={poSupplier} onChange={(e) => setPoSupplier(e.target.value)} placeholder="Dairy Co." /></label>
            </div>
            <button className="btn btn-secondary" onClick={addPoLine}><Plus size={15} />Add line</button>
            {poLines.length > 0 && (
              <div className="data-table">
                <div className="table-head"><span>Item</span><span>Qty</span><span>Unit cost</span><span /></div>
                {poLines.map((line, index) => (
                  <div className="table-row" key={index}>
                    <select value={line.stockId} onChange={(e) => setPoLines((current) => current.map((entry, i) => i === index ? { ...entry, stockId: e.target.value } : entry))}>
                      {stock.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
                    </select>
                    <input type="number" min={0} value={line.quantity} onChange={(e) => setPoLines((current) => current.map((entry, i) => i === index ? { ...entry, quantity: e.target.value } : entry))} />
                    <input type="number" min={0} value={line.unitCost} onChange={(e) => setPoLines((current) => current.map((entry, i) => i === index ? { ...entry, unitCost: e.target.value } : entry))} />
                    <button onClick={() => setPoLines((current) => current.filter((_, i) => i !== index))}><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            )}
            <button className="btn btn-primary" onClick={() => void submitPurchaseOrder()}>Create PO</button>
          </article>
          {purchaseOrders.length === 0 ? (
            <div className="placeholder-panel panel"><h2>No purchase orders</h2></div>
          ) : (
            <div className="data-table panel">
              <div className="table-head"><span>PO</span><span>Supplier</span><span>Status</span><span>Total</span><span /></div>
              {purchaseOrders.map((po) => (
                <div className="table-row" key={po.id}>
                  <strong>{po.id.slice(0, 8)}</strong>
                  <span>{po.supplier}</span>
                  <StatusBadge tone={po.status === "Received" ? "green" : po.status === "Ordered" ? "amber" : "draft"}>{po.status}</StatusBadge>
                  <b>{currency} {po.total.toLocaleString()}</b>
                  <span>
                    {po.status === "Draft" && <button onClick={() => void updatePurchaseOrder(po.id, { status: "Ordered" }).then(() => toast("PO marked ordered")).catch((error) => toast(error instanceof Error ? error.message : "Failed"))}>Mark ordered</button>}
                    {po.status === "Ordered" && <button onClick={() => void updatePurchaseOrder(po.id, { status: "Received" }).then(() => toast("PO received")).catch((error) => toast(error instanceof Error ? error.message : "Failed"))}>Mark received</button>}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "Suppliers" && (
        suppliers.length === 0 ? (
          <div className="placeholder-panel panel"><h2>No suppliers</h2><p>Suppliers are inferred from stock item records.</p></div>
        ) : (
          <div className="data-table panel">
            <div className="table-head"><span>Supplier</span><span>Items</span></div>
            {suppliers.map((supplier) => (
              <div className="table-row" key={supplier}>
                <strong>{supplier}</strong>
                <span>{stock.filter((entry) => entry.supplier === supplier).length} items</span>
              </div>
            ))}
          </div>
        )
      )}

      {tab === "Waste" && (
        <>
          <article className="panel settings-panel">
            <div className="form-grid">
              <label>Stock item<select value={wasteForm.stockId} onChange={(e) => setWasteForm({ ...wasteForm, stockId: e.target.value })}><option value="">Select…</option>{stock.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>
              <label>Quantity<input type="number" min={0} step={0.01} value={wasteForm.quantity} onChange={(e) => setWasteForm({ ...wasteForm, quantity: e.target.value })} /></label>
              <label className="span-2">Reason<input value={wasteForm.reason} onChange={(e) => setWasteForm({ ...wasteForm, reason: e.target.value })} /></label>
            </div>
            <button className="btn btn-primary" onClick={() => void submitWaste()}>Record waste</button>
          </article>
          {waste.length === 0 ? (
            <div className="placeholder-panel panel"><p>No waste logged yet.</p></div>
          ) : (
            <div className="data-table panel">
              <div className="table-head"><span>Item</span><span>Qty</span><span>Est. value</span><span>Reason</span><span>When</span></div>
              {waste.map((entry) => {
                const stockItem = stock.find((item) => item.id === entry.stockId);
                const est = stockItem ? recipeLineCost(stockUnitCost(stockItem), entry.quantity) : 0;
                return (
                <div className="table-row" key={entry.id}>
                  <strong>{entry.stockName}</strong>
                  <span>{entry.quantity}</span>
                  <b>{currency} {est.toLocaleString()}</b>
                  <span>{entry.reason}</span>
                  <small>{new Date(entry.createdAt).toLocaleString()}</small>
                </div>
              );})}
            </div>
          )}
        </>
      )}

      {tab === "Stock ledger" && (
        ledger.length === 0 ? (
          <div className="placeholder-panel panel"><p>Ledger entries appear when stock moves.</p></div>
        ) : (
          <div className="data-table panel">
            <div className="table-head"><span>Item</span><span>Delta</span><span>Reason</span><span>Note</span><span>When</span></div>
            {ledger.map((entry) => (
              <div className="table-row" key={entry.id}>
                <strong>{entry.stockName}</strong>
                <span>{entry.delta > 0 ? `+${entry.delta}` : entry.delta}</span>
                <span>{entry.reason}</span>
                <span>{entry.note || "—"}</span>
                <small>{new Date(entry.createdAt).toLocaleString()}</small>
              </div>
            ))}
          </div>
        )
      )}

      <Modal open={!!stockModal} onClose={() => setStockModal(null)} title={stockModal === "add" ? "Add stock item" : "Edit stock item"}>
        <div className="form-grid">
          <label className="span-2">Name<input value={stockForm.name} onChange={(e) => setStockForm({ ...stockForm, name: e.target.value })} /></label>
          <label>Category<select value={stockForm.category} onChange={(e) => setStockForm({ ...stockForm, category: e.target.value })}>{STOCK_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
          <label>Unit<select value={stockForm.unit} onChange={(e) => setStockForm({ ...stockForm, unit: e.target.value })}>{STOCK_UNITS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}</select></label>
          <label>Quantity<input type="number" min={0} value={stockForm.quantity} onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })} /></label>
          <label>Minimum<input type="number" min={0} value={stockForm.minimum} onChange={(e) => setStockForm({ ...stockForm, minimum: e.target.value })} /></label>
          <label>Unit cost ({currency})<input type="number" min={0} value={stockForm.value} onChange={(e) => setStockForm({ ...stockForm, value: e.target.value })} /></label>
          <label>Cost trend % (optional)<input type="number" value={stockForm.trend} onChange={(e) => setStockForm({ ...stockForm, trend: e.target.value })} placeholder="0" /></label>
          <label>Supplier<input value={stockForm.supplier} onChange={(e) => setStockForm({ ...stockForm, supplier: e.target.value })} /></label>
        </div>
        <div className="product-image-actions">
          <button className="btn btn-primary" onClick={() => void saveStockItem()}>Save</button>
          {stockModal && stockModal !== "add" ? (
            <button className="btn btn-secondary" onClick={() => void removeStockItem(stockModal.id).then(() => { setStockModal(null); toast("Stock item removed"); }).catch((error) => toast(error instanceof Error ? error.message : "Could not remove"))}>Remove</button>
          ) : null}
        </div>
      </Modal>

      <Modal open={!!adjusting} onClose={() => setAdjusting(null)} title={`Adjust ${item?.name ?? "stock"}`}>
        <div className="adjust-modal">
          <p>Current stock</p>
          <strong>{item?.quantity} {item?.unit}</strong>
          <div>
            <button onClick={() => item && adjustStock(item.id, -1)}><Minus />Remove 1</button>
            <button onClick={() => item && adjustStock(item.id, 1)}><Plus />Add 1</button>
            <button onClick={() => item && adjustStock(item.id, 10)}><Plus />Add 10</button>
          </div>
          <label>Physical count quantity<input type="number" min={0} step={0.01} value={countQty} onChange={(e) => setCountQty(e.target.value)} placeholder={item ? String(item.quantity) : "0"} /></label>
          <button className="btn btn-primary btn-full" onClick={() => void submitCount()}>Set counted quantity</button>
        </div>
      </Modal>
    </div>
  );
}
