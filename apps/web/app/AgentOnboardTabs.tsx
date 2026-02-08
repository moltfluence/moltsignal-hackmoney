"use client";

import { useState } from "react";

function originFromLocation(): string {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

export default function AgentOnboardTabs() {
  const [tab, setTab] = useState<"agent" | "manual">("manual");
  const [copied, setCopied] = useState(false);

  const origin = originFromLocation();
  const skillUrl = origin ? `${origin}/skill.md` : "/skill.md";
  const agentUrl = origin ? `${origin}/agent` : "/agent";

  const agentPrompt =
    `Open ${agentUrl} and follow the steps to register, join a campaign, and submit Moltbook proof URLs.`;
  const manualSteps = `curl -fsSL ${skillUrl}`;

  const text = tab === "agent" ? agentPrompt : manualSteps;

  function handleCopy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <div className="flex rounded-full border border-white/10 overflow-hidden mb-4">
        <button
          onClick={() => setTab("agent")}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
            tab === "agent"
              ? "bg-primary text-white"
              : "bg-transparent text-slate-400 hover:text-white"
          }`}
        >
          agent
        </button>
        <button
          onClick={() => setTab("manual")}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
            tab === "manual"
              ? "bg-primary text-white"
              : "bg-transparent text-slate-400 hover:text-white"
          }`}
        >
          manual
        </button>
      </div>

      <div
        onClick={handleCopy}
        className="relative cursor-pointer rounded-xl border border-white/10 bg-background-dark p-4 font-mono text-sm text-primary leading-relaxed hover:border-primary/30 transition-colors group"
      >
        <code>{text}</code>
        <span className="absolute top-3 right-3 text-xs text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
          {copied ? "Copied!" : "Click to copy"}
        </span>
      </div>
    </div>
  );
}
