"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import type { NetworkEdge, NetworkNode } from "@/data/types";

type GraphProps = {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  height?: number;
  variant?: "global" | "local";
  focusNodeId?: string;
  onSelect?: (node: NetworkNode) => void;
};

type SimNode = d3.SimulationNodeDatum & NetworkNode;

type SimEdge = d3.SimulationLinkDatum<SimNode> & {
  id: string;
  strength: number;
};

export default function NetworkGraph({
  nodes,
  edges,
  height = 520,
  variant = "global",
  focusNodeId,
  onSelect,
}: GraphProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 900, height });
  const [, setTick] = useState(0);
  const [hovered, setHovered] = useState<NetworkNode | null>(null);
  const [pulse, setPulse] = useState<{ edgeId: string | null; progress: number }>({
    edgeId: null,
    progress: 0,
  });

  const simNodes = useMemo<SimNode[]>(
    () => nodes.map((node) => ({ ...node })),
    [nodes]
  );

  const simEdges = useMemo<SimEdge[]>(
    () =>
      edges.map((edge) => ({
        ...edge,
        source: edge.source,
        target: edge.target,
      })),
    [edges]
  );

  useEffect(() => {
    if (!wrapperRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        setDimensions({ width, height });
      }
    });
    observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, [height]);

  useEffect(() => {
    if (!dimensions.width) return;
    const simulation = d3
      .forceSimulation(simNodes)
      .force(
        "link",
        d3
          .forceLink(simEdges)
          .id((d) => (d as SimNode).id)
          .distance(variant === "global" ? 120 : 90)
          .strength(0.6)
      )
      .force("charge", d3.forceManyBody().strength(variant === "global" ? -220 : -160))
      .force("center", d3.forceCenter(dimensions.width / 2, dimensions.height / 2))
      .force("collide", d3.forceCollide().radius((d) => 16 + ((d as SimNode).ads || 60) / 6));

    let frame: number | null = null;
    simulation.on("tick", () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        setTick((value) => value + 1);
      });
    });

    const svg = d3.select(svgRef.current);
    const drag = d3
      .drag<SVGCircleElement, SimNode>()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    svg.selectAll<SVGCircleElement, SimNode>("circle.node").call(drag);

    return () => {
      simulation.stop();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [dimensions.width, dimensions.height, simNodes, simEdges, variant]);

  useEffect(() => {
    if (variant !== "global") return;
    let raf: number | null = null;
    const interval = setInterval(() => {
      const edge = edges[Math.floor(Math.random() * edges.length)];
      if (!edge) return;
      const start = performance.now();
      const animate = (now: number) => {
        const progress = Math.min((now - start) / 650, 1);
        setPulse({ edgeId: edge.id, progress });
        if (progress < 1) {
          raf = requestAnimationFrame(animate);
        } else {
          setPulse({ edgeId: null, progress: 0 });
        }
      };
      raf = requestAnimationFrame(animate);
    }, 5200);

    return () => {
      clearInterval(interval);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [edges, variant]);

  useEffect(() => {
    if (variant !== "local") return;
    if (!hovered || !focusNodeId) return;
    const edge = edges.find(
      (item) =>
        (item.source === hovered.id && item.target === focusNodeId) ||
        (item.target === hovered.id && item.source === focusNodeId)
    );
    if (!edge) return;
    let raf: number | null = null;
    const start = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - start) / 400, 1);
      setPulse({ edgeId: edge.id, progress });
      if (progress < 1) {
        raf = requestAnimationFrame(animate);
      } else {
        setPulse({ edgeId: null, progress: 0 });
      }
    };
    raf = requestAnimationFrame(animate);
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [hovered, focusNodeId, edges, variant]);

  const edgePosition = (edge: SimEdge) => {
    const source = edge.source as SimNode;
    const target = edge.target as SimNode;
    return {
      x1: source.x ?? 0,
      y1: source.y ?? 0,
      x2: target.x ?? 0,
      y2: target.y ?? 0,
    };
  };

  const pulseEdge = pulse.edgeId ? simEdges.find((edge) => edge.id === pulse.edgeId) : null;
  const pulsePosition = pulseEdge ? edgePosition(pulseEdge) : null;
  const pulseX = pulsePosition
    ? pulsePosition.x1 + (pulsePosition.x2 - pulsePosition.x1) * pulse.progress
    : 0;
  const pulseY = pulsePosition
    ? pulsePosition.y1 + (pulsePosition.y2 - pulsePosition.y1) * pulse.progress
    : 0;

  return (
    <div className={`graph-shell ${variant}`} ref={wrapperRef} style={{ height }}>
      <svg ref={svgRef} width={dimensions.width} height={dimensions.height}>
        <g>
          {simEdges.map((edge) => {
            const { x1, y1, x2, y2 } = edgePosition(edge);
            return (
              <line
                key={edge.id}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="rgba(237,237,237,0.12)"
                strokeWidth={1}
                strokeLinecap="round"
                opacity={Math.min(0.28, 0.1 + edge.strength * 0.2)}
              />
            );
          })}
          {pulse.edgeId && pulsePosition && (
            <g>
              <circle cx={pulseX} cy={pulseY} r={6} fill="rgba(229,72,77,0.2)" />
              <circle cx={pulseX} cy={pulseY} r={3} fill="#E5484D" />
            </g>
          )}
          {simNodes.map((node) => {
            const baseRadius = variant === "global" ? 10 + node.ads / 12 : 12 + node.ads / 10;
            const isFocused = focusNodeId === node.id;
            const isHovered = hovered?.id === node.id;
            const radius = isHovered ? baseRadius + 2 : baseRadius;
            return (
              <g key={node.id}>
                <circle
                  className="node"
                  cx={node.x}
                  cy={node.y}
                  r={radius}
                  fill={isFocused ? "rgba(229,72,77,0.18)" : "rgba(237,237,237,0.18)"}
                  stroke={isHovered ? "rgba(237,237,237,0.55)" : "rgba(237,237,237,0.2)"}
                  strokeWidth={1}
                  onMouseEnter={() => setHovered(node)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => onSelect?.(node)}
                />
                {hovered?.id === node.id && (
                  <text
                    x={(node.x ?? 0) + radius + 6}
                    y={(node.y ?? 0) + 4}
                    fill="#EDEDED"
                    fontSize="12"
                  >
                    {node.name}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
