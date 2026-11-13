import type { Metadata } from "next";
import { BetaForm } from "@/components/marketing/beta-form";

export const metadata: Metadata = { title: "Join the beta | Caflix", description: "Register your interest in Caflix beta access for your café." };

export default function BetaPage() {
  return <section className="m-beta"><div><p className="m-kicker">HELP SHAPE CAFLIX’S NEXT CHAPTER</p><h1>A better café day.<br /><em>Let’s build it together.</em></h1><p>We’re inviting café owners and teams to register their interest in trying Caflix and sharing feedback from everyday service.</p><ul><li>Explore a connected café workspace.</li><li>Share what matters to your team.</li><li>Help guide what we improve next.</li></ul><p>Leave your details and we can get in touch when beta access is available.</p></div><BetaForm /></section>;
}
