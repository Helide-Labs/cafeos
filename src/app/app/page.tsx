import type { Metadata } from "next";
import CafeApp from "@/components/app/cafe-app";
export const metadata: Metadata = { title: "Workspace | Caflix", robots: { index: false, follow: false } };
export default function Workspace() { return <CafeApp />; }
