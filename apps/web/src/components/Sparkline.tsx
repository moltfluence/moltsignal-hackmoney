type SparklineProps = {
  data: number[];
};

export default function Sparkline({ data }: SparklineProps) {
  const width = 260;
  const height = 56;
  const padding = 6;

  if (!data || data.length === 0) {
    return <svg width={width} height={height} className="sparkline" aria-hidden="true" />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return [x, y];
  });

  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point[0]},${point[1]}`)
    .join(" ");

  const last = points[points.length - 1];

  return (
    <svg width={width} height={height} className="sparkline" aria-hidden="true">
      <path d={path} fill="none" stroke="rgba(237,237,237,0.55)" strokeWidth="1.4" />
      <circle cx={last[0]} cy={last[1]} r={3} fill="#E5484D" />
    </svg>
  );
}
