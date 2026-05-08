"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useEditMode } from "@/components/EditModeContext";
import { formatCurrency, formatPercent } from "@/lib/format";
import type { EnrichedPortfolio, EnrichedBucket, EnrichedPosition } from "@/lib/types";
import { TrendingUp, TrendingDown, ChevronRight, Info } from "lucide-react";

function card(className = "") {
  return `rounded-xl border ${className}`;
}
const cardStyle = { backgroundColor: "#131c2f", borderColor: "#1f2a44" };

function GainLoss({ value, pct, size = "md" }: { value: number | null; pct: number | null; size?: "sm" | "md" | "lg" }) {
  if (value == null) return <span className="text-slate-600">—</span>;
  const pos = value >= 0;
  const color = pos ? "text-emerald-400" : "text-red-400";
  const sizes = { sm: "text-xs", md: "text-sm", lg: "text-base" };
  return (
    <span className={`font-mono tabular-nums ${color} ${sizes[size]}`}>
      {pos ? "+" : ""}{formatCurrency(value)}
      {pct != null && <span className="opacity-70 ml-1">({formatPercent(pct)})</span>}
    </span>
  );
}

function HeroStat({ label, value, sub, subColor, footnote }: {
  label: string;
  value: string;
  sub?: React.ReactNode;
  subColor?: string;
  footnote?: string;
}) {
  return (
    <div className="flex-1 min-w-0">
      <div className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1">{label}</div>
      <div className="text-2xl sm:text-3xl font-mono tabular-nums font-bold text-slate-100 truncate">{value}</div>
      {sub && <div className={`mt-0.5 text-sm font-mono tabular-nums ${subColor ?? "text-slate-400"}`}>{sub}</div>}
      {footnote && <div className="text-xs text-slate-600 mt-0.5">{footnote}</div>}
    </div>
  );
}

function BucketPanel({ bucket, href }: { bucket: EnrichedBucket; href: string }) {
  const pos = (bucket.totalGainLoss ?? 0) >= 0;
  const todayPos = (bucket.todayChange ?? 0) >= 0;
  return (
    <Link href={href} className={`${card("p-5 flex flex-col gap-3 hover:border-slate-500/60 transition-colors cursor-pointer group")} relative overflow-hidden`} style={cardStyle}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: bucket.color }} />
            <span className="text-sm font-semibold text-slate-200">{bucket.name}</span>
          </div>
          <div className="text-xs text-slate-500">{bucket.positions.length} position{bucket.positions.length !== 1 ? "s" : ""}</div>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors mt-0.5 shrink-0" />
      </div>
      <div>
        <div className="text-2xl font-mono tabular-nums font-bold text-slate-100">
          {bucket.totalValue != null ? formatCurrency(bucket.totalValue) : "—"}
        </div>
        <div className={`text-sm font-mono tabular-nums mt-0.5 ${pos ? "text-emerald-400" : "text-red-400"}`}>
          {bucket.totalGainLoss != null ? `${pos ? "+" : ""}${formatCurrency(bucket.totalGainLoss)}` : "—"}
          {bucket.totalGainLossPct != null && (
            <span className="opacity-70 ml-1">({formatPercent(bucket.totalGainLossPct)})</span>
          )}
        </div>
      </div>
      {bucket.todayChange != null && (
        <div className="text-xs font-mono tabular-nums text-slate-500">
          Today{" "}
          <span className={todayPos ? "text-emerald-400" : "text-red-400"}>
            {todayPos ? "+" : ""}{formatCurrency(bucket.todayChange)}
            {bucket.todayChangePct != null && ` (${formatPercent(bucket.todayChangePct)})`}
          </span>
        </div>
      )}
    </Link>
  );
}

function TodaysMover({ pos, isGainer }: { pos: EnrichedPosition & { bucketName: string }; isGainer: boolean }) {
  const dc = pos.dayChange ?? 0;
  const dcp = pos.dayChangePct ?? 0;
  const color = isGainer ? "text-emerald-400" : "text-red-400";
  return (
    <div className="flex items-center justify-between py-1.5">
      <div>
        <span className="font-mono font-semibold text-slate-200 text-sm">{pos.ticker}</span>
        {pos.isMutualFund && <span className="ml-1.5 text-xs text-slate-600">(EOD)</span>}
      </div>
      <div className="text-right">
        <div className={`font-mono tabular-nums text-sm ${color}`}>
          {dc >= 0 ? "+" : ""}{formatCurrency(dc)}
        </div>
        <div className={`font-mono tabular-nums text-xs ${color} opacity-70`}>
          {dcp >= 0 ? "+" : ""}{dcp.toFixed(2)}%
        </div>
      </div>
    </div>
  );
}

export default function DashboardContent() {
  const { isEditMode } = useEditMode();
  const [portfolio, setPortfolio] = useState<EnrichedPortfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await fetch(`/api/portfolio?_=${refreshKey}`);
        if (!res.ok || !active) return;
        const data = await res.json() as EnrichedPortfolio;
        if (active) { setPortfolio(data); setError(null); }
      } catch {
        if (active) setError("Failed to load portfolio data.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [refreshKey]);

  // Auto-refresh every 60s
  useEffect(() => {
    const id = setInterval(() => setRefreshKey((k) => k + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  // Listen for manual refresh event from Header
  useEffect(() => {
    const handler = () => setRefreshKey((k) => k + 1);
    window.addEventListener("portfolio:refresh", handler);
    return () => window.removeEventListener("portfolio:refresh", handler);
  }, []);

  if (loading) return <DashboardSkeleton />;
  if (error || !portfolio) return (
    <main className="max-w-[1400px] mx-auto px-6 py-8">
      <div className="text-center py-20 text-slate-500">
        <p className="mb-4">{error ?? "No portfolio data"}</p>
        <button onClick={refresh} className="text-blue-400 hover:underline text-sm">Retry</button>
      </div>
    </main>
  );

  const rothBucket = portfolio.buckets.find((b) => b.category === "retirement");
  const brokerageBucket = portfolio.buckets.find((b) => b.category === "brokerage");

  // Today's movers — individual stocks, skip SPAXX, sorted by today's $ change
  const allPositions = portfolio.buckets.flatMap((b) =>
    b.positions
      .filter((p) => p.ticker !== "SPAXX" && p.dayChange != null)
      .map((p) => ({ ...p, bucketName: b.name }))
  );
  const byDayChange = [...allPositions].sort((a, b) => (b.dayChange ?? 0) - (a.dayChange ?? 0));
  const topGainers = byDayChange.filter((p) => (p.dayChange ?? 0) > 0).slice(0, 3);
  const topLosers = [...byDayChange].reverse().filter((p) => (p.dayChange ?? 0) < 0).slice(0, 3);

  const recentTrades = [...(portfolio.tradeLog ?? [])].slice(0, 5);

  const totalIsPos = (portfolio.grandTotalGainLoss ?? 0) >= 0;
  const brokerageIsPos = (brokerageBucket?.totalGainLoss ?? 0) >= 0;
  const todayIsPos = (brokerageBucket?.todayChange ?? 0) >= 0;

  return (
    <main className="max-w-[1400px] mx-auto px-6 py-8 w-full">
      {/* Hero stats */}
      <div className={`${card("p-5 mb-8")} flex flex-col sm:flex-row gap-6 sm:gap-0 sm:divide-x sm:divide-[#1f2a44]`} style={cardStyle}>
        <div className="sm:pr-8 flex-1">
          <HeroStat
            label="Total Portfolio"
            value={portfolio.grandTotal != null ? formatCurrency(portfolio.grandTotal) : "—"}
            sub={portfolio.grandTotalGainLoss != null
              ? <GainLoss value={portfolio.grandTotalGainLoss} pct={portfolio.grandTotalGainLossPct} />
              : undefined}
          />
        </div>
        <div className="sm:px-8 flex-1">
          <HeroStat
            label="Brokerage"
            value={brokerageBucket?.totalValue != null ? formatCurrency(brokerageBucket.totalValue) : "—"}
            sub={<GainLoss value={brokerageBucket?.totalGainLoss ?? null} pct={brokerageBucket?.totalGainLossPct ?? null} />}
            subColor={brokerageIsPos ? "text-emerald-400" : "text-red-400"}
          />
        </div>
        <div className="sm:px-8 flex-1">
          <HeroStat
            label="Today (Brokerage)"
            value={brokerageBucket?.todayChange != null
              ? `${todayIsPos ? "+" : ""}${formatCurrency(brokerageBucket.todayChange)}`
              : "—"}
            sub={brokerageBucket?.todayChangePct != null
              ? <span>{formatPercent(brokerageBucket.todayChangePct)}</span>
              : undefined}
            subColor={todayIsPos ? "text-emerald-400" : "text-red-400"}
            footnote="Roth excluded (mutual fund, prices daily)"
          />
        </div>
        {portfolio.realizedYTD !== 0 && (
          <div className="sm:pl-8 flex-1">
            <HeroStat
              label="Realized YTD"
              value={`${portfolio.realizedYTD >= 0 ? "+" : ""}${formatCurrency(portfolio.realizedYTD)}`}
              subColor={portfolio.realizedYTD >= 0 ? "text-emerald-400" : "text-red-400"}
            />
          </div>
        )}
      </div>

      {/* Two-panel bucket cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
        {rothBucket && (
          <BucketPanel bucket={rothBucket} href="/roth" />
        )}
        {brokerageBucket && (
          <BucketPanel bucket={brokerageBucket} href="/brokerage" />
        )}
      </div>

      {/* Today's movers */}
      {(topGainers.length > 0 || topLosers.length > 0) && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-slate-300 mb-3">Today&rsquo;s Movers</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {topGainers.length > 0 && (
              <div className={`${card("p-4")}`} style={cardStyle}>
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium mb-2 uppercase tracking-wider">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Top Gainers
                </div>
                {topGainers.map((p) => (
                  <TodaysMover key={p.ticker} pos={p} isGainer={true} />
                ))}
              </div>
            )}
            {topLosers.length > 0 && (
              <div className={`${card("p-4")}`} style={cardStyle}>
                <div className="flex items-center gap-1.5 text-xs text-red-400 font-medium mb-2 uppercase tracking-wider">
                  <TrendingDown className="w-3.5 h-3.5" />
                  Top Losers
                </div>
                {topLosers.map((p) => (
                  <TodaysMover key={p.ticker} pos={p} isGainer={false} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent trades */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-300">Recent Trades</h2>
          <Link href="/trades" className="text-xs text-blue-400 hover:underline">View all →</Link>
        </div>
        {recentTrades.length === 0 ? (
          <div className={`${card("p-6 text-center text-slate-600 text-sm")}`} style={cardStyle}>
            No trades logged yet.
          </div>
        ) : (
          <div className={`${card("overflow-hidden")}`} style={{ borderColor: "#1f2a44" }}>
            <table className="w-full text-sm">
              <thead className="border-b" style={{ borderColor: "#1f2a44", backgroundColor: "#0b1120" }}>
                <tr>
                  {["Date", "Account", "Action", "Ticker", "Shares", "Price", "Total"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentTrades.map((trade, i) => (
                  <tr key={trade.id} className={`hover:bg-white/[0.02] transition-colors ${i % 2 !== 0 ? "bg-white/[0.01]" : ""}`}>
                    <td className="px-3 py-2.5 text-xs text-slate-500 font-mono whitespace-nowrap">
                      {new Date(trade.timestamp).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-slate-400 max-w-[120px] truncate">
                      {portfolio.buckets.find((b) => b.id === trade.bucketId)?.name ?? trade.bucketId}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                        trade.action === "BUY" ? "bg-emerald-500/15 text-emerald-400" :
                        trade.action === "SELL" ? "bg-red-500/15 text-red-400" :
                        "bg-blue-500/15 text-blue-400"
                      }`}>
                        {trade.action}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono font-semibold text-slate-200">{trade.ticker}</td>
                    <td className="px-3 py-2.5 font-mono tabular-nums text-slate-400 text-xs">{trade.shares}</td>
                    <td className="px-3 py-2.5 font-mono tabular-nums text-slate-400 text-xs">{formatCurrency(trade.price)}</td>
                    <td className="px-3 py-2.5 font-mono tabular-nums text-slate-300 text-xs font-medium">
                      {formatCurrency(trade.shares * trade.price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit mode hint */}
      {isEditMode && (
        <div className="text-center py-4 text-xs text-slate-600">
          <Info className="w-3 h-3 inline mr-1" />
          Edit mode active — use position pages to add/sell positions
        </div>
      )}

      <footer className="mt-8 pt-6 border-t text-center text-xs text-slate-700" style={{ borderColor: "#1f2a44" }}>
        Built with Next.js + Vercel · Live prices from Yahoo Finance
      </footer>
    </main>
  );
}

function DashboardSkeleton() {
  return (
    <main className="max-w-[1400px] mx-auto px-6 py-8 w-full">
      <div className="h-24 rounded-xl animate-pulse mb-8" style={{ backgroundColor: "#131c2f" }} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
        <div className="h-36 rounded-xl animate-pulse" style={{ backgroundColor: "#131c2f" }} />
        <div className="h-36 rounded-xl animate-pulse" style={{ backgroundColor: "#131c2f" }} />
      </div>
      <div className="h-48 rounded-xl animate-pulse" style={{ backgroundColor: "#131c2f" }} />
    </main>
  );
}
