import { PublicHeader, PublicFooter } from "@/components/marketing/shell";
import "./marketing.css";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <div className="marketing"><a className="m-skip" href="#main">Skip to content</a><PublicHeader /><main id="main">{children}</main><PublicFooter /></div>;
}
