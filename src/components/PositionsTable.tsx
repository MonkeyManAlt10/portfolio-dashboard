"use client";

import { useState } from "react";
import { EnrichedPosition } from "@/lib/types";
import { formatCurrency, formatShares, formatPercent } from "@/lib/format";
import { useEditMode } from "./EditModeContext";
import { cn } from "@/lib/utils";
import { Edit2, TrendingDown, Trash2, ChevronUp, ChevronDown } from "lucide-react";

type SortKey = "ticker" | "shares" | "costBasis" | "currentPrice" | "currentValue" | "gainLoss";
type SortDir = "asc" | "desc";

interface PositionsTableProps {
  positions: EnrichedPosition[];
  onEdit?: (ticker: string) => void;
  onSell?: (ticker: string) => void;
  onRemove?: (ticker: string) => void;
}

export default function PositionsTable({
  positions,
  onEdit,
  onSell,
  onRemove,
}: PositionsTableProps) {
  const { isEditMode } = useEditMode();
  const [sortKey, setSortKey] = useState<SortKey>("currentValue");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sorted = [...positions].sort((a, b) => {
    let av: number | string = 0;
    let bv: number | string = 0;
    switch (sortKey) {
      case "ticker": av = a.ticker; bv = b.ticker; break;
      case "shares": av = a.shares; bv = b.shares; break;
      case "costBasis": av = a.costBasis; bv = b.costBasis; break;
      case "currentPrice": av = a.currentPrice ?? -Infinity; bv = b.currentPrice ?? -Infinity; break;
      case "currentValue": av = a.currentValue ?? -Infinity; bv = b.currentValue ?? -Infinity; break;
      case "gainLoss": av = a.gainLoss ?? -Infinity; bv = b.gainLoss ?? -Infinity; break;
    }
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span className="w-3 h-3 inline-block" />;
    return sortDir === "asc"
      ? <ChevronUp className="w-3 h-3 inline-block" />
      : <ChevronDown className="w-3 h-3 inline-block" />;
  }

  function Th({ col, label, right = false }: { col: SortKey; label: string; right?: boolean }) {
    return (
      <th
        onClick={() => toggleSort(col)}
        className={cn(
          "px-3 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer select-none hover:text-slate-300 transition-colors",
          right && "text-right"
        )}
      >
        {label} <SortIcon col={col} />
      </th>
    );
  }

  if (positions.length === 0) {
    return (
      <div className="text-center py-12 text-slate-600">
        <p className="text-sm">No positions yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "#1f2a44" }}>
      <table className="w-full text-sm">
        <thead className="border-b" style={{ borderColor: "#1f2a44" }}>
          <tr style={{ backgroundColor: "#0b1120" }}>
            <Th col="ticker" label="Ticker" />
            <Th col="shares" label="Shares" right />
            <Th col="costBasis" label="Cost Basis" right />
            <Th col="currentPrice" label="Current" right />
            <Th col="currentValue" label="Value" right />
            <Th col="gainLoss" label="Gain/Loss" right />
            {isEditMode && <th className="px-3 py-2 text-xs text-slate-500 text-right">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y" style={{ borderColor: "#1f2a44" }}>
          {sorted.map((pos) => {
            const isPositive = (pos.gainLoss ?? 0) >= 0;
            return (
              <tr
                key={pos.ticker}
                className="transition-colors hover:bg-white/[0.02]"
              >
                <td className="px-3 py-3">
                  <div>
                    <div className="font-mono font-semibold text-slate-100">{pos.ticker}</div>
                    {pos.isMutualFund && pos.lastPriceDate && (
                      <div className="text-xs text-slate-600">Last close: {pos.lastPriceDate}</div>
                    )}
                  </div>
                </td>
                <td className="px-3 py-3 text-right font-mono tabular-nums text-slate-300">
                  {formatShares(pos.shares)}
                </td>
                <td className="px-3 py-3 text-right font-mono tabular-nums text-slate-400">
                  {formatCurrency(pos.costBasis)}
                </td>
                <td className="px-3 py-3 text-right font-mono tabular-nums text-slate-300">
                  {pos.currentPrice != null ? formatCurrency(pos.currentPrice) : "—"}
                </td>
                <td className="px-3 py-3 text-right font-mono tabular-nums text-slate-100 font-medium">
                  {pos.currentValue != null ? formatCurrency(pos.currentValue) : "—"}
                </td>
                <td className="px-3 py-3 text-right">
                  {pos.gainLoss != null ? (
                    <div className="flex flex-col items-end">
                      <span className={cn("font-mono tabular-nums text-xs", isPositive ? "text-emerald-400" : "text-red-400")}>
                        {isPositive ? "+" : ""}{formatCurrency(pos.gainLoss)}
                      </span>
                      <span className={cn("font-mono tabular-nums text-xs", isPositive ? "text-emerald-400" : "text-red-400")}>
                        {formatPercent(pos.gainLossPct ?? 0)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-600">—</span>
                  )}
                </td>
                {isEditMode && (
                  <td className="px-3 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {onEdit && (
                        <button
                          onClick={() => onEdit(pos.ticker)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-400/10 transition-colors"
                          title="Edit position"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onSell && (
                        <button
                          onClick={() => onSell(pos.ticker)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-orange-400 hover:bg-orange-400/10 transition-colors"
                          title="Sell position"
                        >
                          <TrendingDown className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onRemove && (
                        <button
                          onClick={() => onRemove(pos.ticker)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                          title="Remove position"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
  );
}
