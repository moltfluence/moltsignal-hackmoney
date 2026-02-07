"use client";

import { useState } from "react";
import { LockIcon } from "@/components/NavIcons";
import TopBar from "@/components/TopBar";

export default function CreateCampaignPage() {
  const [budget, setBudget] = useState(85000);
  const [objective, setObjective] = useState("Reach");

  const isReady = objective.length > 0;

  return (
    <div className="page">
      <TopBar title="Create Campaign" subtitle="Allocate attention budget by performance" showSearch={false} actionLabel="" />
      <div className="content-container">
        <div className="form-shell">
          <div className="form-stepper">
            <span className="step active">1</span>
            <span className="step">2</span>
            <span className="step">3</span>
          </div>
          <div className="panel form-panel">
            <div className="form-section">
              <div className="section-title">Objective</div>
              <select value={objective} onChange={(event) => setObjective(event.target.value)}>
                <option>Reach</option>
                <option>Engagement</option>
                <option>Awareness</option>
              </select>
              <div className="form-hint">Select the primary goal for distribution performance.</div>
            </div>

            <div className="divider-line" />

            <div className="form-section">
              <div className="section-title">Distribution surface</div>
              <div className="pill-row">
                <button type="button" className="pill active">Moltbook</button>
                <button type="button" className="pill">Blogs</button>
                <button type="button" className="pill disabled" data-tooltip="Coming soon: direct distribution support">
                  <LockIcon /> X
                </button>
                <button type="button" className="pill disabled" data-tooltip="Coming soon: direct distribution support">
                  <LockIcon /> Instagram
                </button>
                <button type="button" className="pill disabled" data-tooltip="Coming soon: direct distribution support">
                  <LockIcon /> TikTok
                </button>
              </div>
            </div>

            <div className="divider-line" />

            <div className="form-section">
              <div className="section-title">Budget + CPV</div>
              <div className="budget-row">
                <input
                  type="range"
                  min={25000}
                  max={200000}
                  value={budget}
                  onChange={(event) => setBudget(Number(event.target.value))}
                />
                <div className="mono">${budget.toLocaleString()}</div>
              </div>
              <div className="radio-row">
                <label>
                  <input type="radio" checked readOnly />
                  Pay per Verified View (CPV)
                </label>
                <span className="row-subtitle">Verified views are tracked by redirect-based validation.</span>
              </div>
            </div>

            <div className="divider-line" />

            <div className="form-section">
              <div className="section-title">Milestones (Auto Release)</div>
              <div className="milestone-builder">
                {[
                  { views: "10,000", payout: "25" },
                  { views: "25,000", payout: "50" },
                  { views: "50,000", payout: "100" },
                ].map((item) => (
                  <div key={item.views} className="milestone-row">
                    <input type="text" defaultValue={item.views} className="mono" />
                    <input type="text" defaultValue={item.payout} className="mono" />
                    <button type="button" className="icon-button">Remove</button>
                  </div>
                ))}
                <button type="button" className="text-button">Add milestone</button>
              </div>
              <div className="milestone-track">
                <span className="track-fill" style={{ width: "0%" }} />
                <span className="track-dot" />
                <span className="track-dot" />
                <span className="track-dot" />
              </div>
            </div>

            <div className="divider-line" />

            <div className="form-section">
              <div className="section-title">Brand / Context</div>
              <input type="text" placeholder="Brand name" />
              <input type="text" placeholder="Brand link" />
              <textarea placeholder="Objective context" rows={4} />
              <div className="upload-placeholder">Optional assets (coming soon)</div>
            </div>

            <div className="form-actions">
              <button type="button" className="btn btn-secondary">Cancel</button>
              <button type="button" className="btn emphasis" disabled={!isReady}>
                Create Campaign
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
