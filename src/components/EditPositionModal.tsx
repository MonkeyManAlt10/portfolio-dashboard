"use client";

import { useState, FormEvent } from "react";
import { useEditMode } from "./EditModeContext";
import { EnrichedPosition } from "@/lib/types";
import { formatShares } from "@/lib/format";
import toast from "react-hot-toast";
import { X } from "lucide-react";

interface EditPositionModalProps {
  position: EnrichedPosition;
  bucketId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditPositionModal({
  position,
  bucketId,
  onClose,
  onSuccess,
}: EditPositionModalProps) {
  const { authFetch } = useEditMode();
  const [shares, setShares] = useState(formatShares(position.shares));
  const [costBasis, setCostBasis] = useState(String(position.costBasis));
  const [notes, setNotes] = useState(position.notes ?? "");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authFetch("/api/positions", {
        method: "PATCH",
        body: JSON.stringify({
          bucketId,
          ticker: position.ticker,
          updates: {
            shares: parseFloat(shares),
            costBasis: parseFloat(costBasis),
            notes: notes || undefined,
          },
        }),
      });

      if (res.ok) {
        toast.success(`Updated ${position.ticker}`);
        onSuccess();
        onClose();
      } else {
        const err = await res.json() as { error?: string };
        toast.error(err.error ?? "Failed to update");
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
          <h2 className="text-base font-semibold text-slate-100">Edit {position.ticker}</h2>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Shares</label>
              <input
                type="number"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                step="0.0001"
                min="0.0001"
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Cost Basis / Share</label>
              <input
                type="number"
                value={costBasis}
                onChange={(e) => setCostBasis(e.target.value)}
                step="0.01"
                min="0"
                required
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes…"
              rows={2}
              className="w-full bg-[#0b1120] border border-[#1f2a44] rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
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
              {loading ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
