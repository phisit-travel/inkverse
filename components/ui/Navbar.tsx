"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Menu, X, LogIn, Download, ChevronDown, WifiOff } from "lucide-react";
import Logo from "./Logo";
import CoinBadge from "./CoinBadge";
import NotificationBell from "./NotificationBell";
import ThemeToggle from "./ThemeToggle";
import SearchBox from "./SearchBox";
import UserMenu from "./UserMenu";
import type { RankBadge } from "@/lib/ranks";
import clsx from "clsx";

interface NavbarProps {
  user?: {
    name?: string | null;
    username?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string;
  } | null;
  userCoins?: number;
  rankBadge?: RankBadge | null;
}

const typeLinks = [
  { href: "/manga", label: "เรื่องทั้งหมด" },
  { href: "/manga?type=MANGA", label: "MANGA" },
  { href: "/manga?type=MANHWA", label: "MANHWA" },
  { href: "/manga?type=MANHUA", label: "MANHUA" },
  { href: "/manga?type=NOVEL", label: "NOVEL" },
];

const applyLinks = [
  { href: "/apply?as=translator", label: "สมัครนักแปล" },
  { href: "/apply?as=writer", label: "สมัครนักเขียน" },
];

// Creator dropdown leads with the how-to guide, then the apply links.
const creatorMenu = [{ href: "/creator-101", label: "สอนสร้างเนื้อหา" }, ...applyLinks];

// Hover dropdown used in the desktop nav to keep the bar uncluttered.
function NavDropdown({
  label,
  items,
}: {
  label: string;
  items: { href: string; label: string; cta?: boolean }[];
}) {
  return (
    <div className="relative group">
      <button className="flex items-center gap-1 text-[11px] uppercase tracking-[0.18em] text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
        {label}
        <ChevronDown className="w-3 h-3" />
      </button>
      {/* pt-3 is an invisible bridge so the menu doesn't close in the gap */}
      <div className="absolute left-0 top-full pt-3 opacity-0 invisible translate-y-1 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 transition-all duration-150 z-50">
        <div className="min-w-[180px] bg-[var(--bg-surface)] border border-[var(--border)] py-2 shadow-xl">
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className={clsx(
                "block px-4 py-2 text-xs uppercase tracking-[0.15em] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-colors",
                it.cta && "download-cta"
              )}
            >
              {it.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// Collapsible group for the mobile (☰) menu — mirrors the avatar dropdown's
// Section so the two surfaces share one design language.
function MobileSection({
  label,
  open,
  onToggle,
  children,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-[var(--border)]/40">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
      >
        {label}
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="pb-1">{children}</div>}
    </div>
  );
}

export default function Navbar({ user, userCoins = 0, rankBadge = null }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  // One section open at a time, like the avatar dropdown.
  const [navSection, setNavSection] = useState<string | null>(null);
  const toggleNav = (key: string) => setNavSection((s) => (s === key ? null : key));
  const isStaff = user?.role === "TRANSLATOR" || user?.role === "ADMIN";
  const closeMenu = () => setMenuOpen(false);
  const mobileSubCls =
    "block pl-6 pr-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 rounded-lg transition-colors";

  return (
    <nav className="sticky top-0 z-50 bg-[var(--bg-primary)]/95 backdrop-blur-md border-b border-[var(--border)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Logo — icon-only on small screens so the bar never overflows
            (logged-in nav: logo+theme+search+coins+bell+avatar+menu is wide). */}
        <div className="sm:hidden shrink-0">
          <Logo variant="icon" size="md" />
        </div>
        <div className="hidden sm:block shrink-0">
          <Logo size="md" />
        </div>

        {/* Desktop nav — two dropdowns keep the bar clean */}
        <div className="hidden lg:flex items-center gap-8">
          <NavDropdown label="เรื่องทั้งหมด" items={typeLinks} />
          <NavDropdown label="ครีเอเตอร์" items={creatorMenu} />
        </div>

        {/* Search + actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Download app — prominent + always visible (sm+); hidden inside the app */}
          <Link
            href="/download"
            className="download-cta hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[var(--text-primary)]/30 text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)] hover:bg-[var(--text-primary)] hover:text-[var(--bg-primary)] transition-colors"
          >
            <Download className="w-4 h-4" />
            โหลดแอป
          </Link>
          <ThemeToggle />
          {/* Desktop search with live suggestions */}
          <SearchBox className="hidden md:block" />

          {/* Mobile search toggle */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            onClick={() => setSearchOpen(!searchOpen)}
          >
            <Search className="w-5 h-5" />
          </button>

          {user ? (
            <>
              <CoinBadge initialCoins={userCoins} />
              <NotificationBell />
              <UserMenu user={user} rankBadge={rankBadge} />
            </>
          ) : (
            <Link
              href="/auth/signin"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bal-btn text-sm font-medium hover:opacity-90 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              เข้าสู่ระบบ
            </Link>
          )}

          {/* Mobile menu */}
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile search bar */}
      {searchOpen && (
        <div className="md:hidden px-4 pb-3">
          <SearchBox autoFocus onNavigate={() => setSearchOpen(false)} />
        </div>
      )}

      {/* Mobile nav menu — collapsible sections matching the avatar dropdown */}
      {menuOpen && (
        <div className="lg:hidden border-t border-[var(--border)] bg-[var(--bg-primary)]">
          <div className="px-4 py-3 flex flex-col">
            {/* Prominent app download — hidden when already inside the app */}
            <Link
              href="/download"
              onClick={closeMenu}
              className="download-cta flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm bal-btn font-semibold mb-2"
            >
              <Download className="w-4 h-4" />
              โหลดแอป Android
            </Link>
            {/* Offline library — only shows inside the app (.app-only); a full-nav
                anchor so it still opens when offline (served from the SW page cache). */}
            <a
              href="/downloads"
              className="app-only items-center gap-2 px-3 py-2.5 mb-1 rounded-lg text-sm text-[var(--text-primary)] hover:bg-white/5 transition-colors font-medium"
            >
              <WifiOff className="w-4 h-4" />
              คลังออฟไลน์
            </a>

            <MobileSection label="เรื่องทั้งหมด" open={navSection === "browse"} onToggle={() => toggleNav("browse")}>
              {typeLinks.map((link) => (
                <Link key={link.href} href={link.href} onClick={closeMenu} className={mobileSubCls}>
                  {link.label}
                </Link>
              ))}
            </MobileSection>

            <MobileSection label="ครีเอเตอร์" open={navSection === "creator"} onToggle={() => toggleNav("creator")}>
              {creatorMenu.map((link) => (
                <Link key={link.href} href={link.href} onClick={closeMenu} className={mobileSubCls}>
                  {link.label}
                </Link>
              ))}
            </MobileSection>

            {isStaff && (
              <MobileSection label="บัญชีของฉัน" open={navSection === "account"} onToggle={() => toggleNav("account")}>
                <Link href="/dashboard" onClick={closeMenu} className={mobileSubCls}>แดชบอร์ด</Link>
                <Link href="/dashboard/new-novel" onClick={closeMenu} className={mobileSubCls}>เขียนนิยาย</Link>
                <Link href="/upload" onClick={closeMenu} className={mobileSubCls}>อัปโหลดมังงะ</Link>
                {user?.role === "ADMIN" && (
                  <Link href="/admin" onClick={closeMenu} className={mobileSubCls}>แอดมิน</Link>
                )}
              </MobileSection>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
