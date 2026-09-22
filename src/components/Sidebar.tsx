"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: DashboardIcon },
  { href: "/inventory", label: "Inventory", icon: InventoryIcon },
  { href: "/vendors", label: "Vendors", icon: VendorsIcon },
  { href: "/boxes", label: "System Boxes", icon: BoxesIcon },
  { href: "/reports", label: "Reports & Analysis", icon: ReportsIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (pathname === "/login") return null;

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
      {NAV_ITEMS.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={`group flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              active
                ? "bg-[image:var(--gradient-brand)] text-white shadow-[0_6px_16px_-6px_rgba(0,112,134,0.5)]"
                : "text-brand-900/70 hover:bg-brand-50 hover:text-brand-900"
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? "text-white" : "text-brand-400 group-hover:text-brand-600"}`} />
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-brand-100 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2">
          <Image src="/bluecroft-logo.png" alt="Bluecroft" width={28} height={28} className="h-7 w-7 object-contain" />
          <span className="text-sm font-semibold text-brand-900">Bluecroft Farming</span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-lg p-2 text-brand-700 hover:bg-brand-50"
          aria-label="Open menu"
        >
          <svg width="22" height="22" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 5h16v1.5H2V5zm0 4.25h16v1.5H2v-1.5zM2 13.5h16V15H2v-1.5z" />
          </svg>
        </button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-brand-900/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-white shadow-2xl">
            <SidebarHeader onClose={() => setMobileOpen(false)} />
            {nav}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-brand-100 bg-white/80 backdrop-blur-sm lg:flex">
        <SidebarHeader />
        {nav}
        <div className="border-t border-brand-100 px-5 py-4">
          <button
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              window.location.href = "/login";
            }}
            className="mb-2 flex items-center gap-1.5 text-xs font-medium text-brand-700/70 hover:text-brand-900"
          >
            <LogoutIcon /> Sign out
          </button>
          <p className="text-xs text-black/35">Bluecroft Farming — next generation farming</p>
        </div>
      </aside>
    </>
  );
}

function SidebarHeader({ onClose }: { onClose?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 px-5 py-5">
      <div className="flex items-center gap-3">
        <Image src="/bluecroft-logo.png" alt="Bluecroft Farming" width={40} height={40} className="h-10 w-10 object-contain" />
        <div>
          <p className="text-sm font-semibold leading-tight text-brand-900">Bluecroft Farming</p>
          <p className="text-xs text-black/45">Crab Inventory System</p>
        </div>
      </div>
      {onClose && (
        <button onClick={onClose} className="rounded-full p-1.5 text-black/40 hover:bg-black/5" aria-label="Close menu">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
        </svg>
        </button>
      )}
    </div>
  );
}

function DashboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path d="M3 3.5A1.5 1.5 0 014.5 2h4A1.5 1.5 0 0110 3.5v4A1.5 1.5 0 018.5 9h-4A1.5 1.5 0 013 7.5v-4zm9 0A1.5 1.5 0 0113.5 2h2A1.5 1.5 0 0117 3.5v2A1.5 1.5 0 0115.5 7h-2A1.5 1.5 0 0112 5.5v-2zm0 6A1.5 1.5 0 0113.5 8h2a1.5 1.5 0 011.5 1.5v6a1.5 1.5 0 01-1.5 1.5h-2a1.5 1.5 0 01-1.5-1.5v-6zM3 12.5A1.5 1.5 0 014.5 11h4A1.5 1.5 0 0110 12.5v4A1.5 1.5 0 018.5 18h-4A1.5 1.5 0 013 16.5v-4z" />
    </svg>
  );
}
function InventoryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm1 5h12v7a1 1 0 01-1 1H5a1 1 0 01-1-1V9zm3 2.5a.75.75 0 000 1.5h6a.75.75 0 000-1.5H7z" />
    </svg>
  );
}
function VendorsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path d="M10 9a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM3 18a7 7 0 1114 0 1 1 0 01-1 1H4a1 1 0 01-1-1z" />
    </svg>
  );
}
function BoxesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path d="M9.55 1.68a1 1 0 01.9 0l6.5 3.25a1 1 0 010 1.79l-6.5 3.24a1 1 0 01-.9 0l-6.5-3.24a1 1 0 010-1.8l6.5-3.24zM2.4 8.2l6.75 3.37c.56.28 1.14.28 1.7 0L17.6 8.2v6.87a1 1 0 01-.55.9l-6.5 3.24a1 1 0 01-.9 0l-6.5-3.24a1 1 0 01-.55-.9V8.2z" />
    </svg>
  );
}
function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "h-3.5 w-3.5"} viewBox="0 0 20 20" fill="currentColor">
      <path d="M8 3a1 1 0 000 2H5a1 1 0 00-1 1v8a1 1 0 001 1h3a1 1 0 100-2H6V5h2a1 1 0 001-1V3H8zm4.29 3.29a1 1 0 011.42 0l3 3a1 1 0 010 1.42l-3 3a1 1 0 01-1.42-1.42L13.59 11H8a1 1 0 110-2h5.59l-1.3-1.29a1 1 0 010-1.42z" />
    </svg>
  );
}
function ReportsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path d="M3 3a1 1 0 011-1h1a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V3zm6 5a1 1 0 011-1h1a1 1 0 011 1v9a1 1 0 01-1 1h-1a1 1 0 01-1-1V8zm6-3a1 1 0 011-1h1a1 1 0 011 1v12a1 1 0 01-1 1h-1a1 1 0 01-1-1V5z" />
    </svg>
  );
}
