"use client";

import type { CSSProperties } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AgentMetricPoint } from "@/data/types";

const tooltipStyle: CSSProperties = {
  background: "#1B2032",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 10,
  padding: "8px 10px",
  color: "#EDEDED",
};

export default function AgentAdsChart({
  data,
  height = 220,
  withPanel = true,
}: {
  data: AgentMetricPoint[];
  height?: number;
  withPanel?: boolean;
}) {
  const lastIndex = data.length - 1;
  const chart = (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 10, right: 10, left: -24, bottom: 0 }}>
          <XAxis dataKey="date" stroke="#8B90A0" tickLine={false} axisLine={false} />
          <YAxis
            stroke="#8B90A0"
            tickLine={false}
            axisLine={false}
            domain={["auto", "auto"]}
          />
          <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "rgba(255,255,255,0.1)" }} />
          <Line
            type="monotone"
            dataKey="ads"
            stroke="rgba(237,237,237,0.7)"
            strokeWidth={1.6}
            dot={(props: { index: number; cx: number; cy: number }) => {
              if (props.index !== lastIndex)
                return <circle cx={0} cy={0} r={0} fill="none" />;
              return (
                <circle
                  cx={props.cx}
                  cy={props.cy}
                  r={4}
                  fill="#E5484D"
                  stroke="#E5484D"
                />
              );
            }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );

  if (!withPanel) return chart;

  return (
    <div className="panel chart-panel">
      <div className="section-title">ADS History</div>
      {chart}
    </div>
  );
}
