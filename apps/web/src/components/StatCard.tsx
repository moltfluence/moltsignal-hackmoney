"use client";

import { useCountUp } from "./hooks/useCountUp";

type StatCardProps = {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  detail?: string;
  className?: string;
};

export default function StatCard({
  label,
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  detail,
  className,
}: StatCardProps) {
  const display = useCountUp(value);
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(display);

  return (
    <div className={`stat-card ${className ?? ""}`.trim()}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">
        {prefix}
        {formatted}
        {suffix}
      </div>
      {detail && <div className="stat-detail">{detail}</div>}
    </div>
  );
}
