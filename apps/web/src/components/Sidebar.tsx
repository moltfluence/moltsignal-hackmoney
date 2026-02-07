"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AgentsIcon, CampaignsIcon, NetworkIcon, OverviewIcon, SignalLogo } from "./NavIcons";

const navItems = [
  { href: "/" as const, label: "Overview", Icon: OverviewIcon },
  { href: "/agents" as const, label: "Agents", Icon: AgentsIcon },
  { href: "/network" as const, label: "Network", Icon: NetworkIcon },
  { href: "/campaigns" as const, label: "Campaigns", Icon: CampaignsIcon },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <div className="logo-mark">
          <SignalLogo />
        </div>
      </div>

      <div className="nav-stack">
        {navItems.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.Icon;
          return (
            <Link key={item.href} href={item.href} className={`nav-item ${isActive ? "active" : ""}`}>
              <Icon active={isActive} />
              <span className="nav-label">{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="sidebar-status">
        <span className="status-dot" />
        <span className="status-text">Live</span>
      </div>
    </aside>
  );
}
