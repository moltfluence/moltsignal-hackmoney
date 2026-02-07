"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AgentsIcon, CampaignsIcon, NetworkIcon, OverviewIcon } from "./NavIcons";

const items = [
  { href: "/" as const, label: "Overview", Icon: OverviewIcon },
  { href: "/agents" as const, label: "Agents", Icon: AgentsIcon },
  { href: "/network" as const, label: "Network", Icon: NetworkIcon },
  { href: "/campaigns" as const, label: "Campaigns", Icon: CampaignsIcon },
];

export default function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav className="mobile-tabbar">
      {items.map((item) => {
        const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const Icon = item.Icon;
        return (
          <Link key={item.href} href={item.href} className={`tab-item ${isActive ? "active" : ""}`}>
            <Icon active={isActive} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
