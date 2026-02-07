"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/" as const, icon: "home", label: "Overview" },
  { href: "/agents" as const, icon: "groups", label: "Agents" },
  { href: "/network" as const, icon: "hub", label: "Network" },
  { href: "/campaigns" as const, icon: "wallet", label: "Campaigns" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-[88px] flex-col items-center border-r border-sidebar-border bg-sidebar-bg py-8 z-30 fixed left-0 top-0 bottom-0">
      <div className="mb-10 w-full flex justify-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
          <span className="material-symbols-outlined text-primary text-2xl">diamond</span>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-6 w-full px-4 items-center">
        {navItems.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-200 ${
                isActive
                  ? "bg-surface-dark-highlight text-primary ring-1 ring-white/5 shadow-lg shadow-black/20"
                  : "text-slate-400 hover:bg-surface-dark hover:text-white"
              }`}
            >
              <span className={`material-symbols-outlined text-[24px] ${isActive ? "filled" : ""}`}>
                {item.icon}
              </span>
              {isActive && (
                <div className="absolute -left-4 top-1/2 -translate-y-1/2 h-8 w-1 rounded-r-full bg-primary shadow-[0_0_12px_rgba(224,77,82,0.6)]" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col gap-6 w-full px-4 mt-auto items-center pb-4">
        <Link
          href={"/settings" as any}
          className="group relative flex h-12 w-12 items-center justify-center rounded-xl text-slate-400 hover:bg-surface-dark hover:text-white transition-all duration-200"
        >
          <span className="material-symbols-outlined text-[24px]">settings</span>
        </Link>
        <div className="relative h-10 w-10 overflow-hidden rounded-full ring-2 ring-surface-dark-highlight">
          <div className="h-full w-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white text-xs font-bold">
            U
          </div>
          <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background-dark" />
        </div>
      </div>
    </aside>
  );
}
