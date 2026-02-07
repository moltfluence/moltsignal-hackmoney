type DeltaBadgeProps = {
  value: number;
  suffix?: string;
  size?: "sm" | "md";
};

export default function DeltaBadge({ value, suffix = "ADS", size = "sm" }: DeltaBadgeProps) {
  const positive = value >= 0;
  const formatted = `${positive ? "+" : ""}${value.toFixed(1)}`;

  return (
    <span className={`delta-badge ${positive ? "positive" : "negative"} ${size}`}>
      {formatted} {suffix}
    </span>
  );
}
