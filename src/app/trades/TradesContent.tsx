"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { formatCurrency } from "@/lib/format";
import type { EnrichedPortfolio, TradeLogEntry, ClosedPosition } from "@/lib/types";
import { Download, Search, Info } from "lucide-react";
import toast from "react-hot-toast";

function RealizedGainsSection({ positions }: { positions: ClosedPosition[] }) {
  const shortTermTotal = positions.filter((p) => p.holdingPeriod === "short").reduce((s, p) => s + p.realizedGain, 0);
  const longTermTotal = positions.filter((p) => p.holdingPeriod === "long").reduce((s, p) => s + p.realizedGain, 0);
  const total = shortTermTotal + longTermTotal;

  return (
    <div className="mb-8">
      <h2 className="text-lg font-bold text-slate-100 mb-3">Realized Gains (YTD)</h2>
      {positions.length === 0 ? (
        <div className="rounded-xl border p-6 text-center text-slate-600 text-sm" style={{ backgroundColor: "#131c2f", borderColor: "#1f2a44" }}>
          No closed positions this year.
        </div>
      ) : (
        <>
          <div className="rounded-xl border overflow-hidden mb-3" style={{ borderColor: "#1f2a44" }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b" style={{ borderColor: "#1f2a44", backgroundColor: "#0b1120" }}>
                  <tr>
                    {["Ticker", "Shares", "Cost", "Proceeds", "Realized G/L", "%", "Term", "Bought", "Sold"].map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {positions.map((p) => {
                    const pos = p.realizedGain >= 0;
                    return (
                      <tr key={p.id} className="border-t hover:bg-white/[0.02] transition-colors" style={{ borderColor: "#1f2a44" }}>
                        <td className="px-3 py-2.5 font-mono font-semibold text-slate-100">{p.ticker}</td>
                        <td className="px-3 py-2.5 font-mono tabular-nums text-slate-400 text-xs">{p.shares}</td>
                        <td className="px-3 py-2.5 font-mono tabular-nums text-slate-400 text-xs">{formatCurrency(p.costBasis)}</td>
                        <td className="px-3 py-2.5 font-mono tabular-nums text-slate-300 text-xs">{formatCurrency(p.proceeds)}</td>
                        <td className="px-3 py-2.5 font-mono tabular-nums text-xs">
                          <span className={pos ? "text-emerald-400" : "text-red-400"}>
                            {pos ? "+" : ""}{formatCurrency(p.realizedGain)}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-mono tabular-nums text-xs">
                          <span className={pos ? "text-emerald-400" : "text-red-400"}>
                            {pos ? "+" : ""}{p.gainPercent.toFixed(2)}%
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-xs">
                          <span className={`px-1.5 py-0.5 rounded-full font-medium ${
                            p.holdingPeriod === "long"
                              ? "bg-blue-500/15 text-blue-400"
                              : "bg-amber-500/15 text-amber-400"
                          }`}>
                            {p.holdingPeriod === "long" ? "Long-term" : "Short-term"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-slate-500 font-mono">{p.firstBuyDate}</td>
                        <td className="px-3 py-2.5 text-xs text-slate-500 font-mono">{p.lastSellDate}</td>
                      </tr>
                    );
                  })}
                  {/* Totals row */}
                  <tr className="border-t" style={{ borderColor: "#1f2a44", backgroundColor: "#0b1120" }}>
                    <td colSpan={4} className="px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Total</td>
                    <td className="px-3 py-2.5 font-mono tabular-nums text-xs font-semibold">
                      <span className={total >= 0 ? "text-emerald-400" : "text-red-400"}>
                        {total >= 0 ? "+" : ""}{formatCurrency(total)}
                      </span>
                    </td>
                    <td colSpan={4} className="px-3 py-2.5 text-xs text-slate-600">
                      Short-term: {shortTermTotal >= 0 ? "+" : ""}{formatCurrency(shortTermTotal)}
                      {longTermTotal !== 0 && ` · Long-term: ${longTermTotal >= 0 ? "+" : ""}${formatCurrency(longTermTotal)}`}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Tax note */}
          <div className="flex items-start gap-2 text-xs text-slate-600 rounded-lg border p-3" style={{ borderColor: "#1f2a44", backgroundColor: "#0b1120" }}>
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-500" />
            <span>
              Short-term gains are taxed as ordinary income. Long-term gains (held 1+ year) are taxed at 0%, 15%, or 20% based on your income.{" "}
              <strong className="text-slate-500">Fidelity is the source of truth at tax time — this is for your reference only.</strong>
            </span>
          </div>
        </>
      )}
    </div>
  );
}

export default function TradesContent() {
  const [portfolio, setPortfolio] = useState<EnrichedPortfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterBucket, setFilterBucket] = useState("all");
  const [filterAction, setFilterAction] = useState("all");
  const [filterTicker, setFilterTicker] = useState("all");
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

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
    const id = setInterval(() => setRefreshKey((k) => k + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const handler = () => setRefreshKey((k) => k + 1);
    window.addEventListener("portfolio:refresh", handler);
    return () => window.removeEventListener("portfolio:refresh", handler);
  }, []);

  const trades = useMemo(() => portfolio?.tradeLog ?? [], [portfolio]);
  const buckets = useMemo(() => portfolio?.buckets ?? [], [portfolio]);
  const closedPositions = useMemo(() => portfolio?.closedPositions ?? [], [portfolio]);

  const uniqueTickers = useMemo(
    () => [...new Set(trades.map((t: TradeLogEntry) => t.ticker))].sort(),
    [trades]
  );

  const filtered = useMemo(() => {
    return trades.filter((t: TradeLogEntry) => {
      if (filterBucket !== "all" && t.bucketId !== filterBucket) return false;
      if (filterAction !== "all" && t.action !== filterAction) return false;
      if (filterTicker !== "all" && t.ticker !== filterTicker) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !t.ticker.toLowerCase().includes(q) &&
          !t.bucketId.toLowerCase().includes(q) &&
          !(t.notes ?? "").toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [trades, filterBucket, filterAction, filterTicker, search]);

  const exportCsv = useCallback(() => {
    const rows = [
      ["Date", "Bucket", "Action", "Ticker", "Shares", "Price", "Total", "Notes"],
      ...filtered.map((t: TradeLogEntry) => [
        new Date(t.timestamp).toISOString(),
        buckets.find((b) => b.id === t.bucketId)?.name ?? t.bucketId,
        t.action,
        t.ticker,
        t.shares,
        t.price,
        (t.shares * t.price).toFixed(2),
        t.notes ?? "",
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trades-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  }, [filtered, buckets]);

  const selectClass = "bg-[#0b1120] border border-[#1f2a44] rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500";

  if (loading) return (
    <main className="max-w-[1400px] mx-auto px-6 py-8">
      <div className="h-80 rounded-xl animate-pulse" style={{ backgroundColor: "#131c2f" }} />
    </main>
  );

  return (
    <main className="max-w-[1400px] mx-auto px-6 py-8 w-full">
      {/* Realized gains */}
      <RealizedGainsSection positions={closedPositions} />

      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-slate-100">Trade Log</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {filtered.length} of {trades.length} entries
          </p>
        </div>
        <button
          onClick={exportCsv}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm text-slate-400 transition-colors hover:text-slate-200 hover:bg-white/5"
          style={{ borderColor: "#1f2a44" }}
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
          <input
            type="text"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-[#0b1120] border border-[#1f2a44] rounded-lg pl-8 pr-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 w-40"
          />
        </div>
        <select value={filterBucket} onChange={(e) => setFilterBucket(e.target.value)} className={selectClass}>
          <option value="all">All Accounts</option>
          {buckets.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)} className={selectClass}>
          <option value="all">All Actions</option>
          <option value="BUY">BUY</option>
          <option value="SELL">SELL</option>
          <option value="ADJUST">ADJUST</option>
        </select>
        <select value={filterTicker} onChange={(e) => setFilterTicker(e.target.value)} className={selectClass}>
          <option value="all">All Tickers</option>
          {uniqueTickers.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border p-12 text-center text-slate-600 text-sm"
          style={{ backgroundColor: "#131c2f", borderColor: "#1f2a44" }}>
          No trades match your filters.
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#1f2a44" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b" style={{ borderColor: "#1f2a44", backgroundColor: "#0b1120" }}>
                <tr>
                  {["Date/Time", "Account", "Action", "Ticker", "Shares", "Price", "Total $", "Notes"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((trade: TradeLogEntry, i) => (
                  <tr key={trade.id} className={`transition-colors hover:bg-white/[0.02] ${i % 2 !== 0 ? "bg-white/[0.01]" : ""}`}>
                    <td className="px-3 py-2.5">
                      <div className="text-xs text-slate-300 font-mono">{new Date(trade.timestamp).toLocaleDateString()}</div>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-slate-400 max-w-[160px] truncate">
                      {buckets.find((b) => b.id === trade.bucketId)?.name ?? trade.bucketId}
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
                    <td className="px-3 py-2.5 text-xs text-slate-600 max-w-[200px] truncate" title={trade.notes}>
                      {trade.notes ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
