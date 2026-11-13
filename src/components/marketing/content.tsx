import Link from "next/link";
import { ArrowRight, ShoppingBag, Coffee, Boxes, BarChart3, Users, ReceiptText } from "lucide-react";

export const features = [
  { icon: ShoppingBag, title: "Keep the queue moving", label: "Point of sale", text: "Build orders, customize items, take payments, and issue receipts from one counter-friendly workspace." },
  { icon: Coffee, title: "Know what goes into every cup", label: "Menu & recipes", text: "Keep your products, prices, modifiers, and ingredient recipes together as your menu evolves." },
  { icon: Boxes, title: "Stay close to your stock", label: "Inventory", text: "Track ingredients, record adjustments and waste, and see low-stock items before your next rush." },
  { icon: BarChart3, title: "See the bigger picture", label: "Reports & overview", text: "Review sales, product performance, and costs to understand the daily rhythm of your business." },
  { icon: ReceiptText, title: "Give every order a clear path", label: "Orders & KDS", text: "Follow orders through preparation and fulfillment, with a shared view for the people making them." },
  { icon: Users, title: "Bring your people together", label: "Team & customers", text: "Manage staff access and customer records alongside the everyday work of running your café." },
];

export function FeatureGrid({ all = false }: { all?: boolean }) {
  return <div className="m-feature-grid">{features.slice(0, all ? 6 : 3).map(({ icon: Icon, title, label, text }) => <article key={label}><Icon size={26} strokeWidth={1.5} /><p className="m-kicker">{label}</p><h3>{title}</h3><p>{text}</p></article>)}</div>;
}

export function CallToAction() {
  return <section className="m-cta"><div><p className="m-kicker">GOOD DAYS START WITH A CLEAR VIEW</p><h2>Make room for what<br />you love about your café.</h2></div><div><Link className="m-button m-button-light" href="/app">Open your workspace <ArrowRight size={18} /></Link><p>New installation? Set up your main account.<br />Already part of a team? Sign in with your staff login.</p></div></section>;
}

export function PageIntro({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return <section className="m-page-intro"><p className="m-kicker">{eyebrow}</p><h1>{title}</h1><p>{text}</p></section>;
}
