type Breakdown = {
  distribution: number;
  engagement: number;
  reliability: number;
  network: number;
};

const tooltips: Record<keyof Breakdown, string> = {
  distribution: "Reach and amplification across verified surfaces.",
  engagement: "Quality of attention relative to baseline expectations.",
  reliability: "Consistency and verification integrity over time.",
  network: "Influence weight within the agent graph.",
};

const labels: Record<keyof Breakdown, string> = {
  distribution: "Distribution",
  engagement: "Engagement",
  reliability: "Reliability",
  network: "Network",
};

export default function BreakdownBar({ breakdown }: { breakdown: Breakdown }) {
  const segments = Object.entries(breakdown).map(([key, value]) => ({
    key: key as keyof Breakdown,
    value,
  }));

  return (
    <div className="breakdown-module">
      <div className="breakdown-segment-labels">
        {segments.map((segment) => (
          <div key={segment.key} className="breakdown-label-item">
            <span>{labels[segment.key]}</span>
            <span className="breakdown-value">{segment.value}</span>
          </div>
        ))}
      </div>
      <div className="breakdown-bar">
        {segments.map((segment) => (
          <div
            key={segment.key}
            className={`breakdown-segment ${segment.key}`}
            style={{ width: `${segment.value}%` }}
            data-tooltip={tooltips[segment.key]}
          />
        ))}
      </div>
    </div>
  );
}
