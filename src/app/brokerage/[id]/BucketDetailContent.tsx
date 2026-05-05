"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import PositionsTable from "@/components/PositionsTable";
import AddPositionModal from "@/components/AddPositionModal";
import EditPositionModal from "@/components/EditPositionModal";
import SellPositionModal from "@/components/SellPositionModal";
import Stat from "@/components/Stat";
import { useEditMode } from "@/components/EditModeContext";
import { formatCurrency, formatRelativeTime } from "@/lib/format";
import type { EnrichedPortfolio, EnrichedBucket, EnrichedPosition, Bucket, TradeLogEntry } from "@/lib/types";
import toast from "react-hot-toast";
import { Plus, ChevronLeft, Edit2, Save, X } from "lucide-react";

interface BucketDetailContentProps {
  bucketId: string;
}

export default function BucketDetailContent({ bucketId }: BucketDetailContentProps) {
  const { isEditMode, authFetch } = useEditMode();
  const [portfolio, setPortfolio] = useState<EnrichedPortfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddPosition, setShowAddPosition] = useState(false);
  const [editPosition, setEditPosition] = useState<EnrichedPosition | null>(null);
  const [sellPosition, setSellPosition] = useState<EnrichedPosition | null>(null);
  const [editingMeta, setEditingMeta] = useState(false);
  const [metaForm, setMetaForm] = useState({ name: "", description: "", color: "#3b82f6" });

  const loadPortfolio = useCallback(async () => {
    const res = await fetch("/api/portfolio");
    if (res.ok) {
      const data = await res.json() as EnrichedPortfolio;
      setPortfolio(data);
      const b = data.buckets.find((b) => b.id === bucketId);
      if (b) setMetaForm({ name: b.name, description: b.description ?? "", color: b.color });
    }
    setLoading(false);
  }, [bucketId]);

  useEffect(() => { loadPortfolio(); }, [loadPortfolio]);

  const bucket: EnrichedBucket | undefined = portfolio?.buckets.find((b) => b.id === bucketId);

  async function saveMeta() {
    const res = await authFetch(`/api/buckets/${bucketId}`, {
      method: "PATCH",
      body: JSON.stringify({ updates: metaForm }),
    });
    if (res.ok) {
      toast.success("Saved");
      setEditingMeta(false);
      loadPortfolio();
    } else {
      const err = await res.json() as { error?: string };
      toast.error(err.error ?? "Failed");
    }
  }

  async function deleteBucket() {
    if (!confirm("Delete this account? This cannot be undone.")) return;
    const res = await authFetch(`/api/buckets/${bucketId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Account deleted");
      window.location.href = "/brokerage";
    } else {
      const err = await res.json() as { error?: string };
      toast.error(err.error ?? "Failed to delete");
    }
  }

  if (loading) return (
    <main className="max-w-[1400px] mx-auto px-6 py-8">
      {[80, 24, 280].map((h, i) => (
        <div key={i} className="rounded-xl animate-pulse mb-6" style={{ backgroundColor: "#131c2f", height: h }} />
      ))}
    </main>
  );

  if (!bucket) return (
    <main className="max-w-[1400px] mx-auto px-6 py-8">
      <div className="text-center py-20 text-slate-500 text-sm">Account not found.</div>
    </main>
  );

  const bucketTrades = (portfolio?.tradeLog ?? []).filter(
    (t: TradeLogEntry) => t.bucketId === bucketId
  ).slice(0, 20);

  return (
    <main className="max-w-[1400px] mx-auto px-6 py-8 w-full">
      {/* Back */}
      <Link href="/brokerage" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 mb-6 transition-colors w-fit">
        <ChevronLeft className="w-4 h-4" /> Brokerage
      </Link>

      {/* Header */}
      <div className="mb-8">
        {editingMeta ? (
          <div className="rounded-xl border p-5 space-y-3" style={{ backgroundColor: "#131c2f", borderColor: "#1f2a44" }}>
            <input
              type="text"
              value={metaForm.name}
              onChange={(e) => setMetaForm({ ...metaForm, name: e.target.value })}
              className="w-full bg-[#0b1120] border border-[#1f2a44] rounded-lg px-3 py-2 text-lg font-semibold text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <textarea
              value={metaForm.description}
              onChange={(e) => setMetaForm({ ...metaForm, description: e.target.value })}
              rows={2}
              className="w-full bg-[#0b1120] border border-[#1f2a44] rounded-lg px-3 py-2 text-sm text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <div className="flex items-center gap-3">
              <input type="color" value={metaForm.color} onChange={(e) => setMetaForm({ ...metaForm, color: e.target.value })}
                className="w-10 h-8 rounded border border-[#1f2a44] cursor-pointer" style={{ backgroundColor: "#0b1120" }} />
              <div className="flex gap-2 ml-auto">
                <button onClick={() => setEditingMeta(false)} className="px-3 py-1.5 rounded-lg text-xs text-slate-400 border border-[#1f2a44] hover:bg-white/5 transition-colors flex items-center gap-1">
                  <X className="w-3 h-3" /> Cancel
                </button>
                <button onClick={saveMeta} className="px-3 py-1.5 rounded-lg text-xs bg-blue-600 hover:bg-blue-500 text-white transition-colors flex items-center gap-1">
                  <Save className="w-3 h-3" /> Save
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: bucket.color }} />
                <h1 className="text-2xl font-bold text-slate-100">{bucket.name}</h1>
                {isEditMode && (
                  <button onClick={() => setEditingMeta(true)} className="ml-1 text-slate-600 hover:text-slate-400 transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              {bucket.description && (
                <p className="text-sm text-slate-500">{bucket.description}</p>
              )}
            </div>
            <div className="flex items-start gap-4">
              <div className="text-right">
                <div className="text-xs text-slate-500 mb-1">Value</div>
                <div className="text-2xl font-mono tabular-nums font-bold text-slate-100">
                  {bucket.totalValue != null ? formatCurrency(bucket.totalValue) : "—"}
                </div>
              </div>
              {isEditMode && (
                <button
                  onClick={deleteBucket}
                  className="px-3 py-1.5 rounded-lg text-xs text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-colors"
                >
                  Delete Account
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Stats strip */}
      {bucket.positions.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Cost Basis", value: formatCurrency(bucket.totalCostBasis) },
            {
              label: "Gain / Loss",
              value: bucket.totalGainLoss != null ? `${bucket.totalGainLoss >= 0 ? "+" : ""}${formatCurrency(bucket.totalGainLoss)}` : "—",
              trend: bucket.totalGainLoss != null ? (bucket.totalGainLoss >= 0 ? "up" as const : "down" as const) : undefined,
            },
            {
              label: "Return",
              value: bucket.totalGainLossPct != null ? `${bucket.totalGainLossPct >= 0 ? "+" : ""}${bucket.totalGainLossPct.toFixed(2)}%` : "—",
              trend: bucket.totalGainLossPct != null ? (bucket.totalGainLossPct >= 0 ? "up" as const : "down" as const) : undefined,
            },
            { label: "Positions", value: String(bucket.positions.length), mono: false },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border p-4" style={{ backgroundColor: "#131c2f", borderColor: "#1f2a44" }}>
              <Stat {...s} size="sm" mono={s.mono !== false} />
            </div>
          ))}
        </div>
      )}

      {/* Positions */}
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
        {bucket.positions.length === 0 && !isEditMode ? (
          <div className="rounded-xl border p-8 text-center text-slate-600 text-sm"
            style={{ backgroundColor: "#131c2f", borderColor: "#1f2a44" }}>
            No positions yet. Enable Edit Mode to add one.
          </div>
        ) : (
          <PositionsTable
            positions={bucket.positions}
            onEdit={isEditMode ? (ticker) => setEditPosition(bucket.positions.find((p) => p.ticker === ticker) ?? null) : undefined}
            onSell={isEditMode ? (ticker) => setSellPosition(bucket.positions.find((p) => p.ticker === ticker) ?? null) : undefined}
          />
        )}
      </div>

      {/* Trade history */}
      {bucketTrades.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-300 mb-3">Trade History</h2>
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#1f2a44" }}>
            <table className="w-full text-sm">
              <thead className="border-b" style={{ borderColor: "#1f2a44", backgroundColor: "#0b1120" }}>
                <tr>
                  {["Date", "Action", "Ticker", "Shares", "Price", "Total"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bucketTrades.map((trade: TradeLogEntry, i) => (
                  <tr key={trade.id} className={i % 2 === 0 ? "" : "bg-white/[0.01]"}>
                    <td className="px-3 py-2 text-xs text-slate-500 font-mono">{formatRelativeTime(trade.timestamp)}</td>
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
                    <td className="px-3 py-2 font-mono tabular-nums text-slate-400 text-xs">{formatCurrency(trade.shares * trade.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAddPosition && (
        <AddPositionModal
          buckets={portfolio!.buckets as unknown as Bucket[]}
          defaultBucketId={bucketId}
          onClose={() => setShowAddPosition(false)}
          onSuccess={loadPortfolio}
        />
      )}
      {editPosition && (
        <EditPositionModal
          position={editPosition}
          bucketId={bucketId}
          onClose={() => setEditPosition(null)}
          onSuccess={loadPortfolio}
        />
      )}
      {sellPosition && (
        <SellPositionModal
          position={sellPosition}
          bucketId={bucketId}
          onClose={() => setSellPosition(null)}
          onSuccess={loadPortfolio}
        />
      )}
    </main>
  );
}
