"use client";

import { useState, useEffect, useCallback } from "react";
import PositionsTable from "@/components/PositionsTable";
import AddPositionModal from "@/components/AddPositionModal";
import EditPositionModal from "@/components/EditPositionModal";
import SellPositionModal from "@/components/SellPositionModal";
import { useEditMode } from "@/components/EditModeContext";
import { formatCurrency, formatPercent } from "@/lib/format";
import type { EnrichedPortfolio, EnrichedBucket, EnrichedPosition, Bucket, ClosedPosition } from "@/lib/types";
import { Plus, Info } from "lucide-react";

type Tab = "long" | "short" | "closed";

const LONG_TERM_DAYS = 365;
const WARN_DAYS = 350;

const cardStyle = { backgroundColor: "#131c2f", borderColor: "#1f2a44" };

function DaysHeldBadge({ daysHeld }: { daysHeld: number }) {
  const remaining = LONG_TERM_DAYS - daysHeld;
  if (daysHeld >= LONG_TERM_DAYS) {
    const years = Math.floor(daysHeld / 365);
    const months = Math.floor((daysHeld % 365) / 30);
    const label = years > 0
      ? `${years}y${months > 0 ? ` ${months}m` : ""}`
      : `${daysHeld}d`;
    return <span className="text-xs text-slate-500 font-mono">{label}</span>;
  }
  if (daysHeld >= WARN_DAYS) {
    return (
      <span className="text-xs font-medium text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-full">
        LT in {remaining}d
      </span>
    );
  }
  return <span className="text-xs text-slate-600 font-mono">{daysHeld}d</span>;
}

function ClosedPositionsTable({ positions }: { positions: ClosedPosition[] }) {
  if (positions.length === 0) {
    return (
      <div className="rounded-xl border p-8 text-center text-slate-600 text-sm" style={cardStyle}>
        No closed positions yet.
      </div>
    );
  }
  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#1f2a44" }}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b" style={{ borderColor: "#1f2a44", backgroundColor: "#0b1120" }}>
            <tr>
              {["Ticker", "Shares", "Avg Buy", "Avg Sell", "Cost", "Proceeds", "Realized G/L", "%", "Term", "Held"].map((h) => (
                <th key={h} className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {positions.map((p) => {
              const pos = p.realizedGain >= 0;
              const days = Math.floor((new Date(p.lastSellDate).getTime() - new Date(p.firstBuyDate).getTime()) / (1000 * 60 * 60 * 24));
              return (
                <tr key={p.id} className="border-t hover:bg-white/[0.02] transition-colors" style={{ borderColor: "#1f2a44" }}>
                  <td className="px-3 py-3 font-mono font-semibold text-slate-100">{p.ticker}</td>
                  <td className="px-3 py-3 font-mono tabular-nums text-slate-400 text-xs">{p.shares}</td>
                  <td className="px-3 py-3 font-mono tabular-nums text-slate-400 text-xs">{formatCurrency(p.avgBuyPrice)}</td>
                  <td className="px-3 py-3 font-mono tabular-nums text-slate-400 text-xs">{formatCurrency(p.avgSellPrice)}</td>
                  <td className="px-3 py-3 font-mono tabular-nums text-slate-400 text-xs">{formatCurrency(p.costBasis)}</td>
                  <td className="px-3 py-3 font-mono tabular-nums text-slate-300 text-xs">{formatCurrency(p.proceeds)}</td>
                  <td className="px-3 py-3 font-mono tabular-nums text-xs">
                    <span className={pos ? "text-emerald-400" : "text-red-400"}>
                      {pos ? "+" : ""}{formatCurrency(p.realizedGain)}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-mono tabular-nums text-xs">
                    <span className={pos ? "text-emerald-400" : "text-red-400"}>
                      {pos ? "+" : ""}{p.gainPercent.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs">
                    <span className={`px-1.5 py-0.5 rounded-full font-medium ${
                      p.holdingPeriod === "long"
                        ? "bg-blue-500/15 text-blue-400"
                        : "bg-amber-500/15 text-amber-400"
                    }`}>
                      {p.holdingPeriod === "long" ? "Long-term" : "Short-term"}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-600 font-mono">{days}d</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PositionsWithMeta({
  positions,
  onEdit,
  onSell,
}: {
  positions: EnrichedPosition[];
  onEdit?: (ticker: string) => void;
  onSell?: (ticker: string) => void;
}) {
  if (positions.length === 0) {
    return (
      <div className="rounded-xl border p-8 text-center text-slate-600 text-sm" style={cardStyle}>
        No positions in this category.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Days-held annotations above table */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#1f2a44" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b" style={{ borderColor: "#1f2a44", backgroundColor: "#0b1120" }}>
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Ticker</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Shares</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Cost Basis</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Current</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Value</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Gain/Loss</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Today</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Held</th>
                {(onEdit || onSell) && <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {positions.map((pos) => {
                const isPos = (pos.gainLoss ?? 0) >= 0;
                const todayPos = (pos.dayChange ?? 0) >= 0;
                const isCash = pos.ticker === "SPAXX";
                return (
                  <tr key={pos.ticker} className="border-t hover:bg-white/[0.02] transition-colors" style={{ borderColor: "#1f2a44" }}>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-semibold text-slate-100">{pos.ticker}</span>
                        {isCash && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 font-medium">Cash</span>
                        )}
                        {pos.isMutualFund && !isCash && (
                          <span className="text-xs text-slate-600">(EOD)</span>
                        )}
                      </div>
                      {pos.lastPriceDate && pos.isMutualFund && !isCash && (
                        <div className="text-xs text-slate-600">Last: {pos.lastPriceDate}</div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums text-slate-300 text-sm">{pos.shares}</td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums text-slate-400 text-xs">{formatCurrency(pos.costBasis)}</td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums text-slate-300 text-sm">
                      {pos.currentPrice != null ? formatCurrency(pos.currentPrice) : "—"}
                    </td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums text-slate-100 font-medium">
                      {pos.currentValue != null ? formatCurrency(pos.currentValue) : "—"}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {pos.gainLoss != null ? (
                        <div>
                          <div className={`font-mono tabular-nums text-xs ${isPos ? "text-emerald-400" : "text-red-400"}`}>
                            {isPos ? "+" : ""}{formatCurrency(pos.gainLoss)}
                          </div>
                          <div className={`font-mono tabular-nums text-xs ${isPos ? "text-emerald-400" : "text-red-400"} opacity-70`}>
                            {formatPercent(pos.gainLossPct ?? 0)}
                          </div>
                        </div>
                      ) : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {pos.dayChange != null && !isCash ? (
                        <div>
                          <div className={`font-mono tabular-nums text-xs ${todayPos ? "text-emerald-400" : "text-red-400"}`}>
                            {todayPos ? "+" : ""}{formatCurrency(pos.dayChange)}
                          </div>
                          {pos.dayChangePct != null && (
                            <div className={`font-mono tabular-nums text-xs ${todayPos ? "text-emerald-400" : "text-red-400"} opacity-70`}>
                              {pos.dayChangePct >= 0 ? "+" : ""}{pos.dayChangePct.toFixed(2)}%
                            </div>
                          )}
                        </div>
                      ) : <span className="text-slate-600 text-xs">—</span>}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <DaysHeldBadge daysHeld={pos.daysHeld} />
                    </td>
                    {(onEdit || onSell) && (
                      <td className="px-3 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {onEdit && (
                            <button
                              onClick={() => onEdit(pos.ticker)}
                              className="px-2 py-1 rounded text-xs text-slate-500 hover:text-blue-400 hover:bg-blue-400/10 transition-colors"
                            >
                              Edit
                            </button>
                          )}
                          {onSell && (
                            <button
                              onClick={() => onSell(pos.ticker)}
                              className="px-2 py-1 rounded text-xs text-slate-500 hover:text-orange-400 hover:bg-orange-400/10 transition-colors"
                            >
                              Sell
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function BrokerageContent() {
  const { isEditMode, authFetch } = useEditMode();
  const [portfolio, setPortfolio] = useState<EnrichedPortfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("long");
  const [showAddPosition, setShowAddPosition] = useState(false);
  const [editPosition, setEditPosition] = useState<EnrichedPosition | null>(null);
  const [sellPosition, setSellPosition] = useState<EnrichedPosition | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let active = true;
    async function load() {
      const res = await fetch(`/api/portfolio?_=${refreshKey}`);
      if (res.ok && active) {
        const data = await res.json() as EnrichedPortfolio;
        if (active) setPortfolio(data);
      }
      if (active) setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [refreshKey]);

  useEffect(() => {
    const handler = () => setRefreshKey((k) => k + 1);
    window.addEventListener("portfolio:refresh", handler);
    return () => window.removeEventListener("portfolio:refresh", handler);
  }, []);

  if (loading) return (
    <main className="max-w-[1400px] mx-auto px-6 py-8">
      <div className="space-y-4">
        <div className="h-20 rounded-xl animate-pulse" style={{ backgroundColor: "#131c2f" }} />
        <div className="h-12 rounded-xl animate-pulse" style={{ backgroundColor: "#131c2f" }} />
        <div className="h-64 rounded-xl animate-pulse" style={{ backgroundColor: "#131c2f" }} />
      </div>
    </main>
  );

  const brokerageBucket = portfolio?.buckets.find((b) => b.category === "brokerage") as EnrichedBucket | undefined;
  const closedPositions = portfolio?.closedPositions ?? [];
  const today = new Date();

  const longTermPositions = brokerageBucket?.positions.filter((p) => p.daysHeld >= LONG_TERM_DAYS) ?? [];
  const shortTermPositions = brokerageBucket?.positions.filter((p) => p.daysHeld < LONG_TERM_DAYS) ?? [];

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: "long", label: "Long-Term Holdings", count: longTermPositions.length },
    { key: "short", label: "Short-Term Holdings", count: shortTermPositions.length },
    { key: "closed", label: "Closed Positions", count: closedPositions.length },
  ];

  const pos = (brokerageBucket?.totalGainLoss ?? 0) >= 0;
  const todayPos = (brokerageBucket?.todayChange ?? 0) >= 0;

  return (
    <main className="max-w-[1400px] mx-auto px-6 py-8 w-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Brokerage</h1>
          <p className="text-sm text-slate-500 mt-1">Fidelity Individual — TODZ21398761</p>
        </div>
        <div className="flex items-start gap-6">
          <div className="text-right">
            <div className="text-xs text-slate-500 mb-1">Value</div>
            <div className="text-2xl font-mono tabular-nums font-bold text-slate-100">
              {brokerageBucket?.totalValue != null ? formatCurrency(brokerageBucket.totalValue) : "—"}
            </div>
            <div className={`text-sm font-mono tabular-nums ${pos ? "text-emerald-400" : "text-red-400"}`}>
              {brokerageBucket?.totalGainLoss != null
                ? `${pos ? "+" : ""}${formatCurrency(brokerageBucket.totalGainLoss)}`
                : "—"}
              {brokerageBucket?.totalGainLossPct != null && (
                <span className="opacity-70 ml-1">({formatPercent(brokerageBucket.totalGainLossPct)})</span>
              )}
            </div>
            {brokerageBucket?.todayChange != null && (
              <div className={`text-xs font-mono tabular-nums ${todayPos ? "text-emerald-400" : "text-red-400"}`}>
                Today {todayPos ? "+" : ""}{formatCurrency(brokerageBucket.todayChange)}
                {brokerageBucket.todayChangePct != null && ` (${formatPercent(brokerageBucket.todayChangePct)})`}
              </div>
            )}
          </div>
          {isEditMode && (
            <button
              onClick={() => setShowAddPosition(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Position
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-2 p-1 rounded-xl" style={{ backgroundColor: "#0b1120" }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === t.key
                ? "bg-blue-600 text-white"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            }`}
          >
            {t.label}
            <span className={`ml-1.5 text-xs ${activeTab === t.key ? "text-blue-200" : "text-slate-600"}`}>
              ({t.count})
            </span>
          </button>
        ))}
      </div>

      {/* Tax hint */}
      <div className="flex items-start gap-1.5 text-xs text-slate-600 mb-5">
        <Info className="w-3 h-3 mt-0.5 shrink-0" />
        <span>
          Long-term = held 1+ year (lower capital gains tax rate). Short-term = held under 1 year (taxed as ordinary income).
        </span>
      </div>

      {/* Tab content */}
      {activeTab === "long" && (
        <PositionsWithMeta
          positions={longTermPositions}
          onEdit={isEditMode ? (ticker) => setEditPosition(brokerageBucket?.positions.find((p) => p.ticker === ticker) ?? null) : undefined}
          onSell={isEditMode ? (ticker) => setSellPosition(brokerageBucket?.positions.find((p) => p.ticker === ticker) ?? null) : undefined}
        />
      )}
      {activeTab === "short" && (
        <PositionsWithMeta
          positions={shortTermPositions}
          onEdit={isEditMode ? (ticker) => setEditPosition(brokerageBucket?.positions.find((p) => p.ticker === ticker) ?? null) : undefined}
          onSell={isEditMode ? (ticker) => setSellPosition(brokerageBucket?.positions.find((p) => p.ticker === ticker) ?? null) : undefined}
        />
      )}
      {activeTab === "closed" && (
        <ClosedPositionsTable positions={closedPositions} />
      )}

      {showAddPosition && portfolio && (
        <AddPositionModal
          buckets={portfolio.buckets as unknown as Bucket[]}
          defaultBucketId="brokerage"
          onClose={() => setShowAddPosition(false)}
          onSuccess={refresh}
        />
      )}
      {editPosition && (
        <EditPositionModal
          position={editPosition}
          bucketId="brokerage"
          onClose={() => setEditPosition(null)}
          onSuccess={refresh}
        />
      )}
      {sellPosition && (
        <SellPositionModal
          position={sellPosition}
          bucketId="brokerage"
          onClose={() => setSellPosition(null)}
          onSuccess={refresh}
        />
      )}
    </main>
  );
}
