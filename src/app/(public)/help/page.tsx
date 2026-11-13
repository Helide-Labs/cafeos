import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageIntro } from "@/components/marketing/content";
export const metadata: Metadata = { title: "Help center | Caflix", description: "Get started with your Caflix workspace, staff sign-in, menu, and inventory." };
const questions = [
  ["How do I get started?", "Open the workspace. On a new installation, Caflix asks you to create the main account. That owner account can configure the café and create staff logins. If the café is already set up, sign in with your assigned username and password."],
  ["Can my team create their own accounts?", "Staff accounts are created by the main account owner. Ask your café owner for a login. Your account’s role determines which parts of the workspace you can access."],
  ["What should I add before taking my first order?", "Start in Menu & recipes: create your products and set their prices. Add ingredients in Inventory and connect them to recipes to track ingredient use. Review your café settings before starting service."],
  ["Why is my dashboard empty?", "A new workspace starts without demo products or orders. Add your menu and begin recording orders to build up your café’s activity and reporting."],
  ["I can’t sign in. What should I do?", "Check your username and password, including capitalization. If you’re a staff member, ask the main account owner to check your account and access. There is no public self-service password reset on this installation."],
  ["Why can’t I see every module?", "Caflix shows the workspace available to your role. Ask the main account owner to review your role if you need additional access for your work."],
];
export default function Help() {
  return <><PageIntro eyebrow="HELP CENTER" title="A little guidance goes a long way." text="Setting up your first menu or finding your way back into the workspace? Start here." /><section className="m-help"><aside><p className="m-kicker">YOUR FIRST STEPS</p><h2>Ready for your first shift?</h2><p>Set up your account, add your menu, and make Caflix part of your daily rhythm.</p><Link className="m-button" href="/app">Go to workspace <ArrowRight size={17} /></Link><p className="m-help-note">Need account access? Your café’s main account owner is your first point of contact.</p></aside><div className="m-faq"><h2>Common questions</h2>{questions.map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></section></>;
}
