"use client";

import { useState, FormEvent } from "react";
import { useEditMode } from "./EditModeContext";
import { EnrichedPosition } from "@/lib/types";
import { formatCurrency, formatShares } from "@/lib/format";
import toast from "react-hot-toast";
import { X } from "lucide-react";

interface SellPositionModalProps {
  position: EnrichedPosition;
  bucketId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SellPositionModal({
  position,
  bucketId,
  onClose,
  onSuccess,
}: SellPositionModalProps) {
  const { authFetch } = useEditMode();
  const [sharesToSell, setSharesToSell] = useState(String(position.shares));
  const [salePrice, setSalePrice] = useState(
    position.currentPrice != null ? String(position.currentPrice.toFixed(2)) : ""
  );
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const sharesNum = parseFloat(sharesToSell) || 0;
  const priceNum = parseFloat(salePrice) || 0;
  const proceeds = sharesNum * priceNum;
  const costForShares = sharesNum * position.costBasis;
  const pnl = proceeds - costForShares;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (sharesNum <= 0 || sharesNum > position.shares) {
      toast.error("Invalid share count");
      return;
    }
    if (priceNum <= 0) {
      toast.error("Enter a sale price");
      return;
    }

    setLoading(true);
    try {
      const res = await authFetch("/api/positions", {
        method: "DELETE",
        body: JSON.stringify({
          bucketId,
          ticker: position.ticker,
          sharesSold: sharesNum,
          salePrice: priceNum,
          notes: notes || undefined,
        }),
      });

      if (res.ok) {
        toast.success(`Sold ${formatShares(sharesNum)} shares of ${position.ticker}`);
        onSuccess();
        onClose();
      } else {
        const err = await res.json() as { error?: string };
        toast.error(err.error ?? "Failed to record sale");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full bg-[#0b1120] border border-[#1f2a44] rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono";
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
          <div>
            <h2 className="text-base font-semibold text-slate-100">Sell {position.ticker}</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Holding {formatShares(position.shares)} shares @ {formatCurrency(position.costBasis)} avg cost
            </p>
          </div>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Shares to Sell</label>
              <input
                type="number"
                value={sharesToSell}
                onChange={(e) => setSharesToSell(e.target.value)}
                step="0.0001"
                min="0.0001"
                max={position.shares}
                required
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => setSharesToSell(String(position.shares))}
                className="text-xs text-blue-400 mt-1 hover:underline"
              >
                Sell all
              </button>
            </div>
            <div>
              <label className={labelClass}>Sale Price / Share</label>
              <input
                type="number"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                step="0.01"
                min="0.01"
                required
                className={inputClass}
              />
              {position.currentPrice != null && (
                <button
                  type="button"
                  onClick={() => setSalePrice(position.currentPrice!.toFixed(2))}
                  className="text-xs text-blue-400 mt-1 hover:underline"
                >
                  Use market ({formatCurrency(position.currentPrice)})
                </button>
              )}
            </div>
          </div>

          {/* P&L preview */}
          {sharesNum > 0 && priceNum > 0 && (
            <div
              className="rounded-lg p-3 border text-xs space-y-1"
              style={{ backgroundColor: "#0b1120", borderColor: "#1f2a44" }}
            >
              <div className="flex justify-between text-slate-400">
                <span>Proceeds</span>
                <span className="font-mono">{formatCurrency(proceeds)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Cost basis</span>
                <span className="font-mono">{formatCurrency(costForShares)}</span>
              </div>
              <div className={`flex justify-between font-medium border-t pt-1 mt-1 font-mono ${pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}
                style={{ borderColor: "#1f2a44" }}>
                <span>P&amp;L</span>
                <span>{pnl >= 0 ? "+" : ""}{formatCurrency(pnl)}</span>
              </div>
            </div>
          )}

          <div>
            <label className={labelClass}>Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes…"
              className="w-full bg-[#0b1120] border border-[#1f2a44] rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
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
              className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white transition-colors"
            >
              {loading ? "Recording…" : "Record Sale"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
