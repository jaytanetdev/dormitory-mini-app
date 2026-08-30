"use client";

import { History, Home, ReceiptText } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "หน้าหลัก", icon: Home },
  { href: "/invoices/inv-2026-08", label: "บิลของฉัน", icon: ReceiptText },
  { href: "/payments", label: "ประวัติ", icon: History },
];

export function BottomNav() {
  const pathname = usePathname();
  return <nav className="bottom-nav" aria-label="เมนูหลัก">{items.map(({ href, label, icon: Icon }) => {
    const active = href === "/" ? pathname === "/" : pathname.startsWith(href.split("/").slice(0, 2).join("/"));
    return <Link key={href} href={href} className={`nav-item ${active ? "active" : ""}`} aria-current={active ? "page" : undefined}><Icon size={20} aria-hidden="true" /><span>{label}</span></Link>;
  })}</nav>;
}
