"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Stat from "@/components/Stat";
import BucketCard from "@/components/BucketCard";
import AllocationDonut from "@/components/AllocationDonut";
import AddPositionModal from "@/components/AddPositionModal";
import { useEditMode } from "@/components/EditModeContext";
import { formatCurrency, formatPercent, formatRelativeTime } from "@/lib/format";
import type { EnrichedPortfolio, TradeLogEntry, Bucket } from "@/lib/types";
import { Plus, TrendingUp, TrendingDown } from "lucide-react";

export default function DashboardContent() {
  const { isEditMode } = useEditMode();
  const [portfolio, setPortfolio] = useState<EnrichedPortfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddPosition, setShowAddPosition] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPortfolio = useCallback(async () => {
    try {
      const res = await fetch("/api/portfolio");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json() as EnrichedPortfolio;
      setPortfolio(data);
      setError(null);
    } catch {
      setError("Failed to load portfolio data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPortfolio();
    const interval = setInterval(loadPortfolio, 60_000);
    return () => clearInterval(interval);
  }, [loadPortfolio]);

  if (loading) return <DashboardSkeleton />;
  if (error || !portfolio) return (
    <main className="max-w-[1400px] mx-auto px-6 py-8">
      <div className="text-center py-20 text-slate-500">
        <p className="mb-4">{error ?? "No portfolio data"}</p>
        <button onClick={loadPortfolio} className="text-blue-400 hover:underline text-sm">Retry</button>
      </div>
    </main>
  );

  const isPositive = (portfolio.grandTotalGainLoss ?? 0) >= 0;

  // Top movers
  const allPositions = portfolio.buckets.flatMap((b) =>
    b.positions
      .filter((p) => p.gainLossPct != null)
      .map((p) => ({ ...p, bucketName: b.name }))
  );
  const byGain = [...allPositions].sort((a, b) => (b.gainLossPct ?? 0) - (a.gainLossPct ?? 0));
  const topGainers = byGain.slice(0, 3);
  const topLosers = byGain.slice(-3).reverse().filter((p) => (p.gainLossPct ?? 0) < 0);

  // Recent trades
  const recentTrades = portfolio.tradeLog.slice(0, 5);

  return (
    <main className="max-w-[1400px] mx-auto px-6 py-8 w-full">
      {/* Hero */}
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-medium">
            Total Portfolio Value
          </div>
          <div className="text-5xl font-mono tabular-nums font-bold text-slate-100">
            {portfolio.grandTotal != null ? formatCurrency(portfolio.grandTotal) : "—"}
          </div>
          {portfolio.grandTotalGainLoss != null && (
            <div className={`mt-2 text-lg font-mono tabular-nums ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
              {isPositive ? "+" : ""}{formatCurrency(portfolio.grandTotalGainLoss)}{" "}
              <span className="text-base">({formatPercent(portfolio.grandTotalGainLossPct ?? 0)})</span>
            </div>
          )}
        </div>
        {isEditMode && (
          <button
            onClick={() => setShowAddPosition(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Position
          </button>
        )}
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10">
        <div className="rounded-xl border p-4" style={{ backgroundColor: "#131c2f", borderColor: "#1f2a44" }}>
          <Stat label="Total Cost Basis" value={formatCurrency(portfolio.grandTotalCostBasis)} size="sm" />
        </div>
        <div className="rounded-xl border p-4" style={{ backgroundColor: "#131c2f", borderColor: "#1f2a44" }}>
          <Stat
            label="Total Gain / Loss"
            value={portfolio.grandTotalGainLoss != null ? `${isPositive ? "+" : ""}${formatCurrency(portfolio.grandTotalGainLoss)}` : "—"}
            trend={portfolio.grandTotalGainLoss != null ? (isPositive ? "up" : "down") : "neutral"}
            size="sm"
          />
        </div>
        <div className="rounded-xl border p-4" style={{ backgroundColor: "#131c2f", borderColor: "#1f2a44" }}>
          <Stat
            label="Return"
            value={portfolio.grandTotalGainLossPct != null ? formatPercent(portfolio.grandTotalGainLossPct) : "—"}
            trend={portfolio.grandTotalGainLossPct != null ? (portfolio.grandTotalGainLossPct >= 0 ? "up" : "down") : "neutral"}
            size="sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-10">
        {/* Allocation chart */}
        <div className="xl:col-span-1">
          <div className="rounded-xl border p-5" style={{ backgroundColor: "#131c2f", borderColor: "#1f2a44" }}>
            <h2 className="text-sm font-semibold text-slate-300 mb-4">Allocation</h2>
            <AllocationDonut buckets={portfolio.buckets} grandTotal={portfolio.grandTotal} />
            {/* Legend */}
            <div className="mt-4 space-y-1.5">
              {portfolio.buckets.map((b) => {
                const pct = portfolio.grandTotal && b.totalValue
                  ? (b.totalValue / portfolio.grandTotal) * 100
                  : 0;
                return (
                  <div key={b.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: b.color }} />
                      <span className="text-slate-400 truncate max-w-[160px]">{b.name}</span>
                    </div>
                    <span className="font-mono tabular-nums text-slate-500">{pct.toFixed(1)}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bucket grid */}
        <div className="xl:col-span-2">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Accounts</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {portfolio.buckets.map((bucket) => (
              <BucketCard
                key={bucket.id}
                bucket={bucket}
                href={bucket.category === "retirement" ? "/roth" : `/brokerage/${bucket.id}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Top movers */}
      {(topGainers.length > 0 || topLosers.length > 0) && (
        <div className="mb-10">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Today&rsquo;s Movers</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {topGainers.length > 0 && (
              <div className="rounded-xl border p-4" style={{ backgroundColor: "#131c2f", borderColor: "#1f2a44" }}>
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium mb-3 uppercase tracking-wider">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Top Gainers
                </div>
                {topGainers.map((p) => (
                  <div key={p.ticker} className="flex items-center justify-between py-1.5">
                    <div>
                      <span className="font-mono font-semibold text-slate-200 text-sm">{p.ticker}</span>
                      <span className="text-xs text-slate-600 ml-2">{p.bucketName}</span>
                    </div>
                    <span className="font-mono tabular-nums text-emerald-400 text-sm">
                      {formatPercent(p.gainLossPct ?? 0)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {topLosers.length > 0 && (
              <div className="rounded-xl border p-4" style={{ backgroundColor: "#131c2f", borderColor: "#1f2a44" }}>
                <div className="flex items-center gap-1.5 text-xs text-red-400 font-medium mb-3 uppercase tracking-wider">
                  <TrendingDown className="w-3.5 h-3.5" />
                  Top Losers
                </div>
                {topLosers.map((p) => (
                  <div key={p.ticker} className="flex items-center justify-between py-1.5">
                    <div>
                      <span className="font-mono font-semibold text-slate-200 text-sm">{p.ticker}</span>
                      <span className="text-xs text-slate-600 ml-2">{p.bucketName}</span>
                    </div>
                    <span className="font-mono tabular-nums text-red-400 text-sm">
                      {formatPercent(p.gainLossPct ?? 0)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent trades */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-300">Recent Trades</h2>
          <Link href="/trades" className="text-xs text-blue-400 hover:underline">View all →</Link>
        </div>
        {recentTrades.length === 0 ? (
          <div className="rounded-xl border p-6 text-center text-slate-600 text-sm"
            style={{ backgroundColor: "#131c2f", borderColor: "#1f2a44" }}>
            No trades logged yet.
          </div>
        ) : (
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#1f2a44" }}>
            <table className="w-full text-sm">
              <thead className="border-b" style={{ borderColor: "#1f2a44", backgroundColor: "#0b1120" }}>
                <tr>
                  {["Date", "Bucket", "Action", "Ticker", "Shares", "Price"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentTrades.map((trade: TradeLogEntry, i) => (
                  <tr key={trade.id} className={i % 2 === 0 ? "" : "bg-white/[0.01]"}>
                    <td className="px-3 py-2 text-xs text-slate-500 font-mono">
                      {formatRelativeTime(trade.timestamp)}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-400">
                      {portfolio.buckets.find((b) => b.id === trade.bucketId)?.name ?? trade.bucketId}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                        trade.action === "BUY" ? "bg-emerald-500/15 text-emerald-400" :
                        trade.action === "SELL" ? "bg-red-500/15 text-red-400" :
                        "bg-blue-500/15 text-blue-400"
                      }`}>
                        {trade.action}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono font-semibold text-slate-200">{trade.ticker}</td>
                    <td className="px-3 py-2 font-mono tabular-nums text-slate-400 text-xs">{trade.shares}</td>
                    <td className="px-3 py-2 font-mono tabular-nums text-slate-400 text-xs">{formatCurrency(trade.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-12 pt-6 border-t text-center text-xs text-slate-700"
        style={{ borderColor: "#1f2a44" }}>
        Built with Next.js + Vercel · Live prices from Yahoo Finance
      </footer>

      {showAddPosition && (
        <AddPositionModal
          buckets={portfolio.buckets as unknown as Bucket[]}
          onClose={() => setShowAddPosition(false)}
          onSuccess={loadPortfolio}
        />
      )}
    </main>
  );
}

function DashboardSkeleton() {
  return (
    <main className="max-w-[1400px] mx-auto px-6 py-8 w-full">
      <div className="h-16 w-72 rounded-xl animate-pulse mb-8" style={{ backgroundColor: "#131c2f" }} />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl animate-pulse" style={{ backgroundColor: "#131c2f" }} />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="h-64 rounded-xl animate-pulse" style={{ backgroundColor: "#131c2f" }} />
        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-xl animate-pulse" style={{ backgroundColor: "#131c2f" }} />
          ))}
        </div>
      </div>
    </main>
  );
}
