"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ArrowUpRight, Coffee, Menu, X } from "lucide-react";

const links = [["Features", "/features"], ["Our approach", "/about"], ["Help center", "/help"]];

export function PublicHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return <header className="m-header"><Link href="/" className="m-brand" aria-label="Caflix home"><span><Coffee size={23} /></span>caflix<span className="m-brand-dot">.</span></Link><button className="m-menu" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} aria-controls="public-nav" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button><nav id="public-nav" className={open ? "m-nav is-open" : "m-nav"} aria-label="Main navigation">{links.map(([label, href]) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} onClick={() => setOpen(false)}>{label}</Link>)}<Link href="/login" className="m-login" onClick={() => setOpen(false)}>Sign in <ArrowUpRight size={16} /></Link><Link href="/app" className="m-button" onClick={() => setOpen(false)}>Open your workspace <ArrowUpRight size={16} /></Link></nav></header>;
}

export function PublicFooter() {
  return <footer className="m-footer"><div><Link href="/" className="m-brand"><Coffee size={24} /> caflix.</Link><p>A little less admin.<br />A lot more café.</p></div><div><strong>Explore</strong><Link href="/features">Features</Link><Link href="/about">Our approach</Link></div><div><strong>Get started</strong><Link href="/help">Help center</Link><Link href="/login">Sign in</Link><Link href="/app">Your workspace</Link></div><div className="m-footer-bottom"><span>© {new Date().getFullYear()} Caflix</span><span>Made for the everyday rhythm of your café.</span></div></footer>;
}
