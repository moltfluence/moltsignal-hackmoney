"use client";

import { useCountUp } from "./hooks/useCountUp";

type CountUpProps = {
  value: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
};

export default function CountUp({ value, suffix = "", prefix = "", decimals = 0 }: CountUpProps) {
  const display = useCountUp(value);
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(display);
  return (
    <span>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
