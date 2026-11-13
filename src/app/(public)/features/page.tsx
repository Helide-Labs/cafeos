import type { Metadata } from "next";
import { CallToAction, FeatureGrid, PageIntro } from "@/components/marketing/content";
export const metadata: Metadata = { title: "Features | Caflix", description: "Explore Caflix point of sale, recipes, inventory, orders, reports, and team tools." };
export default function Features() {
  return <><PageIntro eyebrow="ONE CONNECTED WORKSPACE" title="Everything behind a great café day." text="Tools for the counter, the kitchen, and the decisions you make after closing. All connected to the same daily operation." /><section className="m-section m-section-tight"><FeatureGrid all /></section><section className="m-workflow"><p className="m-kicker">A NATURAL FLOW</p><h2>Start with your menu. Build from there.</h2><ol><li><span>01</span><h3>Make it yours</h3><p>Add your products, prices, ingredients, and recipes.</p></li><li><span>02</span><h3>Bring in the team</h3><p>The owner creates staff accounts with access for each role.</p></li><li><span>03</span><h3>Run your day</h3><p>Take orders, manage stock, and review your performance.</p></li></ol></section><CallToAction /></>;
}
