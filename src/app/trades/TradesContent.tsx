"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { formatCurrency, formatRelativeTime } from "@/lib/format";
import type { EnrichedPortfolio, TradeLogEntry } from "@/lib/types";
import { Download, Search } from "lucide-react";
import toast from "react-hot-toast";

export default function TradesContent() {
  const [portfolio, setPortfolio] = useState<EnrichedPortfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterBucket, setFilterBucket] = useState("all");
  const [filterAction, setFilterAction] = useState("all");
  const [filterTicker, setFilterTicker] = useState("");
  const [search, setSearch] = useState("");

  const loadPortfolio = useCallback(async () => {
    const res = await fetch("/api/portfolio");
    if (res.ok) setPortfolio(await res.json() as EnrichedPortfolio);
    setLoading(false);
  }, []);

  useEffect(() => { loadPortfolio(); }, [loadPortfolio]);

  const trades = portfolio?.tradeLog ?? [];
  const buckets = portfolio?.buckets ?? [];

  const uniqueTickers = useMemo(() => [...new Set(trades.map((t) => t.ticker))].sort(), [trades]);

  const filtered = useMemo(() => {
    return trades.filter((t: TradeLogEntry) => {
      if (filterBucket !== "all" && t.bucketId !== filterBucket) return false;
      if (filterAction !== "all" && t.action !== filterAction) return false;
      if (filterTicker !== "all" && t.ticker !== filterTicker) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!t.ticker.toLowerCase().includes(q) && !t.bucketId.toLowerCase().includes(q) && !(t.notes ?? "").toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [trades, filterBucket, filterAction, filterTicker, search]);

  function exportCsv() {
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
  }

  const selectClass = "bg-[#0b1120] border border-[#1f2a44] rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500";

  if (loading) return (
    <main className="max-w-[1400px] mx-auto px-6 py-8">
      <div className="h-80 rounded-xl animate-pulse" style={{ backgroundColor: "#131c2f" }} />
    </main>
  );

  return (
    <main className="max-w-[1400px] mx-auto px-6 py-8 w-full">
      <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Trade Log</h1>
          <p className="text-sm text-slate-500 mt-1">
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

      {/* Filters */}
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
              <tbody className="divide-y" style={{ borderColor: "#1f2a44" }}>
                {filtered.map((trade: TradeLogEntry, i) => (
                  <tr key={trade.id} className={`transition-colors hover:bg-white/[0.02] ${i % 2 === 0 ? "" : "bg-white/[0.01]"}`}>
                    <td className="px-3 py-2.5">
                      <div className="text-xs text-slate-300 font-mono">{new Date(trade.timestamp).toLocaleDateString()}</div>
                      <div className="text-xs text-slate-600 font-mono">{formatRelativeTime(trade.timestamp)}</div>
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
