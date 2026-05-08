"use client";

import { useState, useEffect, useCallback } from "react";
import PositionsTable from "@/components/PositionsTable";
import ProjectionChart from "@/components/ProjectionChart";
import Stat from "@/components/Stat";
import AddPositionModal from "@/components/AddPositionModal";
import EditPositionModal from "@/components/EditPositionModal";
import SellPositionModal from "@/components/SellPositionModal";
import { useEditMode } from "@/components/EditModeContext";
import { formatCurrency } from "@/lib/format";
import type { EnrichedPortfolio, EnrichedPosition, Bucket } from "@/lib/types";
import toast from "react-hot-toast";
import { Plus, Info } from "lucide-react";

const ROTH_BUCKET_ID = "roth-ira";
const CURRENT_YEAR = new Date().getFullYear();

export default function RothContent() {
  const { isEditMode, authFetch } = useEditMode();
  const [portfolio, setPortfolio] = useState<EnrichedPortfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddPosition, setShowAddPosition] = useState(false);
  const [editPosition, setEditPosition] = useState<EnrichedPosition | null>(null);
  const [sellPosition, setSellPosition] = useState<EnrichedPosition | null>(null);
  const [editingContrib, setEditingContrib] = useState(false);
  const [contribValue, setContribValue] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let active = true;
    async function load() {
      const res = await fetch("/api/portfolio");
      if (res.ok && active) {
        const data = await res.json() as EnrichedPortfolio;
        if (active) setPortfolio(data);
      }
      if (active) setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [refreshKey]);

  const rothBucket = portfolio?.buckets.find((b) => b.id === ROTH_BUCKET_ID);
  const rothSettings = portfolio?.rothSettings;

  async function saveContrib() {
    const val = parseFloat(contribValue);
    if (isNaN(val) || val < 0) { toast.error("Invalid amount"); return; }
    const res = await authFetch("/api/roth-settings", {
      method: "PATCH",
      body: JSON.stringify({ contributedThisYear: val }),
    });
    if (res.ok) {
      toast.success("Contribution updated");
      setEditingContrib(false);
      refresh();
    } else {
      toast.error("Failed to update");
    }
  }

  if (loading) return <LoadingSkeleton />;
  if (!portfolio || !rothBucket || !rothSettings) {
    return (
      <main className="max-w-[1400px] mx-auto px-6 py-8">
        <div className="text-center py-20 text-slate-500 text-sm">
          Roth IRA account not found.
        </div>
      </main>
    );
  }

  const remaining = rothSettings.annualContributionLimit - rothSettings.contributedThisYear;
  const contribPct = Math.min(
    100,
    (rothSettings.contributedThisYear / rothSettings.annualContributionLimit) * 100
  );

  return (
    <main className="max-w-[1400px] mx-auto px-6 py-8 w-full">
      <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: rothBucket.color }} />
            <h1 className="text-2xl font-bold text-slate-100">Roth IRA</h1>
          </div>
          <p className="text-sm text-slate-500">{rothBucket.description}</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Account Value</div>
          <div className="text-3xl font-mono tabular-nums font-bold text-slate-100">
            {rothBucket.totalValue != null ? formatCurrency(rothBucket.totalValue) : "—"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Cost Basis", value: formatCurrency(rothBucket.totalCostBasis) },
          {
            label: "Total Gain",
            value: rothBucket.totalGainLoss != null ? `${rothBucket.totalGainLoss >= 0 ? "+" : ""}${formatCurrency(rothBucket.totalGainLoss)}` : "—",
            trend: rothBucket.totalGainLoss != null ? (rothBucket.totalGainLoss >= 0 ? "up" as const : "down" as const) : undefined,
          },
          {
            label: "Return",
            value: rothBucket.totalGainLossPct != null ? `${rothBucket.totalGainLossPct >= 0 ? "+" : ""}${rothBucket.totalGainLossPct.toFixed(2)}%` : "—",
            trend: rothBucket.totalGainLossPct != null ? (rothBucket.totalGainLossPct >= 0 ? "up" as const : "down" as const) : undefined,
          },
          { label: "Positions", value: String(rothBucket.positions.length), mono: false },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border p-4" style={{ backgroundColor: "#131c2f", borderColor: "#1f2a44" }}>
            <Stat {...s} size="sm" mono={s.mono !== false} />
          </div>
        ))}
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-300">Positions</h2>
          {isEditMode && (
            <button
              onClick={() => setShowAddPosition(true)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Position
            </button>
          )}
        </div>
        <PositionsTable
          positions={rothBucket.positions}
          onEdit={isEditMode ? (ticker) => setEditPosition(rothBucket.positions.find((p) => p.ticker === ticker) ?? null) : undefined}
          onSell={isEditMode ? (ticker) => setSellPosition(rothBucket.positions.find((p) => p.ticker === ticker) ?? null) : undefined}
        />
      </div>

      <div className="mb-8">
        <div className="rounded-xl border p-6" style={{ backgroundColor: "#131c2f", borderColor: "#1f2a44" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-300">{CURRENT_YEAR} Contribution</h2>
            {isEditMode && !editingContrib && (
              <button
                onClick={() => { setEditingContrib(true); setContribValue(String(rothSettings.contributedThisYear)); }}
                className="text-xs text-blue-400 hover:underline"
              >
                Edit
              </button>
            )}
          </div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-400 font-mono tabular-nums">{formatCurrency(rothSettings.contributedThisYear)} contributed</span>
            <span className="text-slate-500 font-mono tabular-nums">of {formatCurrency(rothSettings.annualContributionLimit)}</span>
          </div>
          <div className="h-2 rounded-full bg-[#1f2a44] mb-3">
            <div className="h-2 rounded-full bg-blue-500 transition-all" style={{ width: `${contribPct}%` }} />
          </div>
          <div className={`text-sm font-mono tabular-nums ${remaining > 0 ? "text-emerald-400" : "text-slate-500"}`}>
            {remaining > 0 ? `${formatCurrency(remaining)} remaining for ${CURRENT_YEAR}` : `Limit reached for ${CURRENT_YEAR}`}
          </div>
          {editingContrib && (
            <div className="mt-4 flex gap-2">
              <input
                type="number"
                value={contribValue}
                onChange={(e) => setContribValue(e.target.value)}
                step="0.01"
                min="0"
                className="flex-1 bg-[#0b1120] border border-[#1f2a44] rounded-lg px-3 py-1.5 text-sm text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button onClick={saveContrib} className="px-3 py-1.5 rounded-lg text-sm bg-blue-600 hover:bg-blue-500 text-white transition-colors">Save</button>
              <button onClick={() => setEditingContrib(false)} className="px-3 py-1.5 rounded-lg text-sm text-slate-400 border border-[#1f2a44] hover:bg-white/5 transition-colors">Cancel</button>
            </div>
          )}
        </div>
      </div>

      <div className="mb-8">
        <div className="rounded-xl border p-6" style={{ backgroundColor: "#131c2f", borderColor: "#1f2a44" }}>
          <h2 className="text-sm font-semibold text-slate-300 mb-1">Growth Projection</h2>
          <p className="text-xs text-slate-500 mb-4">
            Assumes {formatCurrency(rothSettings.annualContributionLimit)} added annually. Compound interest at {rothSettings.projectionRates.map((r) => `${(r * 100).toFixed(1)}%`).join(", ")}.
          </p>
          <ProjectionChart bucket={rothBucket} settings={rothSettings} />
        </div>
      </div>

      <div className="rounded-xl border p-6" style={{ backgroundColor: "#131c2f", borderColor: "#1f2a44" }}>
        <div className="flex items-center gap-2 mb-4">
          <Info className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-semibold text-slate-300">Insights</h2>
        </div>
        <ul className="space-y-3 text-sm text-slate-400">
          <li className="flex gap-2">
            <span className="text-blue-400 shrink-0">•</span>
            VTSAX is your foundation — broad US equity exposure, ~0.04% expense ratio. Excellent long-term holding.
          </li>
          <li className="flex gap-2">
            <span className="text-blue-400 shrink-0">•</span>
            Consider 20–30% international exposure (VTIAX) when ready for geographic diversification.
          </li>
          <li className="flex gap-2">
            <span className="text-blue-400 shrink-0">•</span>
            Roth IRA growth is tax-free — these are the most precious dollars you have. Long horizon, set and forget.
          </li>
          <li className="flex gap-2">
            <span className="text-blue-400 shrink-0">•</span>
            Max out contributions every year ({formatCurrency(rothSettings.annualContributionLimit)}/year for {CURRENT_YEAR}).
          </li>
        </ul>
      </div>

      {showAddPosition && (
        <AddPositionModal
          buckets={portfolio.buckets as unknown as Bucket[]}
          defaultBucketId={ROTH_BUCKET_ID}
          onClose={() => setShowAddPosition(false)}
          onSuccess={refresh}
        />
      )}
      {editPosition && (
        <EditPositionModal
          position={editPosition}
          bucketId={ROTH_BUCKET_ID}
          onClose={() => setEditPosition(null)}
          onSuccess={refresh}
        />
      )}
      {sellPosition && (
        <SellPositionModal
          position={sellPosition}
          bucketId={ROTH_BUCKET_ID}
          onClose={() => setSellPosition(null)}
          onSuccess={refresh}
        />
      )}
    </main>
  );
}

function LoadingSkeleton() {
  return (
    <main className="max-w-[1400px] mx-auto px-6 py-8">
      {[80, 24, 48, 280].map((h, i) => (
        <div key={i} className="rounded-xl animate-pulse mb-6" style={{ backgroundColor: "#131c2f", height: h }} />
      ))}
    </main>
  );
}
