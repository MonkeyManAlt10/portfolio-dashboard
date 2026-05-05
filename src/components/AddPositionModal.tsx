"use client";

import { useState, FormEvent } from "react";
import { useEditMode } from "./EditModeContext";
import { Bucket } from "@/lib/types";
import toast from "react-hot-toast";
import { X } from "lucide-react";

interface AddPositionModalProps {
  buckets: Bucket[];
  defaultBucketId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddPositionModal({
  buckets,
  defaultBucketId,
  onClose,
  onSuccess,
}: AddPositionModalProps) {
  const { authFetch } = useEditMode();
  const [bucketId, setBucketId] = useState(defaultBucketId ?? buckets[0]?.id ?? "");
  const [ticker, setTicker] = useState("");
  const [shares, setShares] = useState("");
  const [costBasis, setCostBasis] = useState("");
  const [addedDate, setAddedDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [validatingTicker, setValidatingTicker] = useState(false);
  const [tickerValid, setTickerValid] = useState<boolean | null>(null);

  async function validateTicker(t: string) {
    if (!t || t.length < 1) { setTickerValid(null); return; }
    setValidatingTicker(true);
    try {
      const res = await fetch(`/api/prices?tickers=${encodeURIComponent(t.toUpperCase())}`);
      const data = await res.json() as Record<string, unknown>;
      setTickerValid(!!data[t.toUpperCase()]);
    } catch {
      setTickerValid(false);
    } finally {
      setValidatingTicker(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!ticker || !shares || !costBasis) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const res = await authFetch("/api/positions", {
        method: "POST",
        body: JSON.stringify({
          bucketId,
          position: {
            ticker: ticker.toUpperCase().trim(),
            shares: parseFloat(shares),
            costBasis: parseFloat(costBasis),
            addedDate,
            notes: notes || undefined,
          },
        }),
      });

      if (res.ok) {
        toast.success(`Added ${ticker.toUpperCase()} to portfolio`);
        onSuccess();
        onClose();
      } else {
        const err = await res.json() as { error?: string };
        toast.error(err.error ?? "Failed to add position");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full bg-[#0b1120] border border-[#1f2a44] rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all";
  const labelClass = "block text-xs text-slate-500 mb-1 font-medium uppercase tracking-wider";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(11, 17, 32, 0.85)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-md rounded-2xl border p-6"
        style={{ backgroundColor: "#131c2f", borderColor: "#1f2a44" }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-slate-100">Add Position</h2>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Bucket</label>
            <select
              value={bucketId}
              onChange={(e) => setBucketId(e.target.value)}
              className={inputClass}
            >
              {buckets.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Ticker <span className="text-red-400">*</span></label>
            <div className="relative">
              <input
                type="text"
                value={ticker}
                onChange={(e) => {
                  setTicker(e.target.value.toUpperCase());
                  setTickerValid(null);
                }}
                onBlur={(e) => validateTicker(e.target.value)}
                placeholder="e.g. AAPL, VTSAX"
                required
                className={inputClass + " pr-8 font-mono"}
              />
              {validatingTicker && (
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500">…</span>
              )}
              {tickerValid === true && (
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-emerald-400">✓</span>
              )}
              {tickerValid === false && (
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-red-400">✗</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Shares <span className="text-red-400">*</span></label>
              <input
                type="number"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                placeholder="0.0000"
                step="0.0001"
                min="0"
                required
                className={inputClass + " font-mono"}
              />
            </div>
            <div>
              <label className={labelClass}>Cost Basis / Share <span className="text-red-400">*</span></label>
              <input
                type="number"
                value={costBasis}
                onChange={(e) => setCostBasis(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                required
                className={inputClass + " font-mono"}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Date Added</label>
            <input
              type="date"
              value={addedDate}
              onChange={(e) => setAddedDate(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes…"
              rows={2}
              className={inputClass + " resize-none"}
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm text-slate-400 border border-[#1f2a44] hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white transition-colors"
            >
              {loading ? "Adding…" : "Add Position"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
