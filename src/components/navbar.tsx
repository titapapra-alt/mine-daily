"use client";
import Link from "next/link";
import { BookHeart, CalendarDays, ChartNoAxesCombined, House, LogOut } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
const links = [{ href: "/", label: "Home", Icon: House }, { href: "/diary", label: "Daily", Icon: BookHeart }, { href: "/calendar", label: "Calendar", Icon: CalendarDays }, { href: "/insights", label: "Insights", Icon: ChartNoAxesCombined }];
export function Navbar() { const pathname = usePathname(); const router = useRouter(); const logout = async () => { await createClient().auth.signOut(); router.push("/login"); router.refresh(); }; return <nav className="nav glass" aria-label="Main navigation"><Link href="/" className="brand">Mine</Link><div className="nav-links">{links.map(({ href, label, Icon }) => <Link href={href} className="nav-link" aria-current={pathname === href ? "page" : undefined} key={href}><Icon size={17} className="inline-block md:mr-1" /><span>{label}</span></Link>)}</div><button className="icon-button desktop-only" onClick={logout} aria-label="Sign out"><LogOut size={18} /></button></nav>; }
