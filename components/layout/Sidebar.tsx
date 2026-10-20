"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Profile } from "@/types/database";
import { roleLabel } from "@/lib/roles";

type NavItem = { href: string; label: string; divider?: boolean };

const PRIMARY: NavItem[] = [
  { href: "/today", label: "Today" },
  { href: "/inventory", label: "Inventory" },
  { href: "/prep", label: "Prep" },
  { href: "/deals", label: "Deals" },
];

const MORE: NavItem[] = [
  { href: "/costs", label: "Costs" },
  { href: "/leads", label: "Leads" },
  { href: "/customers", label: "Customers" },
  { href: "/reports", label: "Reports", divider: true },
  { href: "/team", label: "Team" },
  { href: "/floor-plan", label: "Floor plan", divider: true },
  { href: "/time-to-line", label: "Time to line" },
  { href: "/ecm", label: "ECM" },
  { href: "/appraisals", label: "Appraisal" },
  { href: "/keys", label: "Keys" },
  { href: "/consignments", label: "Consign" },
  { href: "/titles", label: "Titles" },
  { href: "/audit", label: "Audit" },
];

const DESKTOP: NavItem[] = [
  { href: "/today", label: "Today" },
  { href: "/inventory", label: "Inventory" },
  { href: "/prep", label: "Prep" },
  { href: "/costs", label: "Costs" },
  { href: "/leads", label: "Leads", divider: true },
  { href: "/deals", label: "Deals" },
  { href: "/customers", label: "Customers" },
  { href: "/reports", label: "Reports", divider: true },
  { href: "/team", label: "Team" },
  { href: "/floor-plan", label: "Floor plan", divider: true },
  { href: "/time-to-line", label: "Time to line" },
  { href: "/ecm", label: "ECM" },
  { href: "/appraisals", label: "Appraisal" },
  { href: "/keys", label: "Keys" },
  { href: "/consignments", label: "Consign" },
  { href: "/titles", label: "Titles" },
  { href: "/audit", label: "Audit" },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

function NavLink({
  item,
  pathname,
  badges,
  onNavigate,
  className,
}: {
  item: NavItem;
  pathname: string;
  badges: Record<string, number>;
  onNavigate?: () => void;
  className?: string;
}) {
  const current = isActive(pathname, item.href);
  const count = badges[item.href] ?? 0;
  return (
    <Link
      href={item.href}
      aria-current={current ? "page" : undefined}
      onClick={onNavigate}
      className={cn(
        "flex justify-between items-center text-left px-2.5 py-2.5 min-h-11 rounded-lg font-display text-base lg:text-lg font-medium border-2 border-transparent hover:bg-white/10 whitespace-nowrap gap-2",
        current && "border-white font-semibold",
        className,
      )}
    >
      <span>{item.label}</span>
      {count > 0 && (
        <span className="font-sans text-xs font-semibold bg-amber text-[#1B1400] rounded-[10px] px-1.5 py-0.5">
          {count}
        </span>
      )}
    </Link>
  );
}

export function Sidebar({
  profile,
  badges = {},
}: {
  profile: Profile;
  badges?: Record<string, number>;
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = MORE.some((item) => isActive(pathname, item.href));
  const moreBadge = MORE.reduce((n, item) => n + (badges[item.href] ?? 0), 0);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="side hidden lg:flex bg-sign text-sign-ink flex-col gap-1 p-[22px_14px] min-h-screen">
        <div className="brand font-display font-bold text-[28px] leading-none px-2.5">
          RigDesk
        </div>
        <div className="dealer text-[13px] opacity-80 px-2.5 pb-5">
          Magnum Truck Sales, Chicago
        </div>
        <nav className="nav flex flex-col gap-1 flex-1">
          {DESKTOP.map((item) => (
            <div key={item.href}>
              {item.divider && (
                <hr className="border-0 border-t border-white/25 my-2 mx-2.5" />
              )}
              <NavLink item={item} pathname={pathname} badges={badges} />
            </div>
          ))}
        </nav>
        <div className="side-foot mt-auto text-[12.5px] opacity-80 px-2.5 leading-snug">
          Signed in as <strong>{profile.name}</strong>
          <br />
          {roleLabel(profile.role)}
        </div>
      </aside>

      {/* Phone / tablet bottom tabs */}
      <aside className="side lg:hidden z-40 bg-sign text-sign-ink border-t border-white/15 safe-bottom">
        <nav className="nav flex items-stretch justify-around gap-0.5 px-1 pt-1.5 pb-1">
          {PRIMARY.map((item) => {
            const current = isActive(pathname, item.href);
            const count = badges[item.href] ?? 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={current ? "page" : undefined}
                onClick={() => setMoreOpen(false)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1 min-h-12 px-1 py-1.5 rounded-md font-display text-[14px] sm:text-[15px] font-medium hover:bg-white/10",
                  current && "bg-white/15 font-semibold",
                )}
              >
                {item.label}
                {count > 0 && (
                  <span className="font-sans text-[11px] font-semibold bg-amber text-[#1B1400] rounded-[10px] px-1.5 py-0.5">
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
          <button
            type="button"
            aria-expanded={moreOpen}
            aria-controls="more-nav"
            onClick={() => setMoreOpen((v) => !v)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1 min-h-12 px-1 py-1.5 rounded-md font-display text-[14px] sm:text-[15px] font-medium hover:bg-white/10",
              (moreOpen || moreActive) && "bg-white/15 font-semibold",
            )}
          >
            More
            {moreBadge > 0 && (
              <span className="font-sans text-[11px] font-semibold bg-amber text-[#1B1400] rounded-[10px] px-1.5 py-0.5">
                {moreBadge}
              </span>
            )}
          </button>
        </nav>
      </aside>

      {/* More sheet */}
      {moreOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/45"
            onClick={() => setMoreOpen(false)}
          />
          <div
            id="more-nav"
            role="dialog"
            aria-label="More screens"
            className="absolute bottom-0 left-0 right-0 max-h-[75vh] overflow-auto bg-sign text-sign-ink rounded-t-2xl p-3 pb-[calc(12px+env(safe-area-inset-bottom,0px))] shadow-xl"
          >
            <div className="flex items-center justify-between px-2 pb-2 mb-1 border-b border-white/20">
              <div>
                <div className="font-display font-bold text-2xl leading-none">
                  RigDesk
                </div>
                <div className="text-[13px] opacity-80 mt-1">
                  {profile.name} · {roleLabel(profile.role)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="min-h-11 px-3 rounded-lg font-display text-lg hover:bg-white/10"
              >
                Close
              </button>
            </div>
            <nav className="grid grid-cols-2 sm:grid-cols-3 gap-1 pt-2">
              {MORE.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  badges={badges}
                  onNavigate={() => setMoreOpen(false)}
                  className="!py-3"
                />
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
