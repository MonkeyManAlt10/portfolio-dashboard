import Link from "next/link";
import { EnrichedBucket } from "@/lib/types";
import { formatCurrency, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

interface BucketCardProps {
  bucket: EnrichedBucket;
  href?: string;
  large?: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  retirement: "Retirement",
  brokerage: "Brokerage",
  savings: "Savings",
};

export default function BucketCard({ bucket, href, large = false }: BucketCardProps) {
  const hasData = bucket.totalValue !== null;
  const isPositive = (bucket.totalGainLoss ?? 0) >= 0;

  const card = (
    <div
      className={cn(
        "rounded-xl border p-5 card-hover transition-all",
        large && "p-6",
        href && "cursor-pointer"
      )}
      style={{ backgroundColor: "#131c2f", borderColor: "#1f2a44" }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0 mt-0.5"
            style={{ backgroundColor: bucket.color }}
          />
          <div>
            <div className={cn("font-medium text-slate-100", large ? "text-base" : "text-sm")}>
              {bucket.name}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {CATEGORY_LABELS[bucket.category] ?? bucket.category} ·{" "}
              {bucket.positions.length} position{bucket.positions.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
        {href && <ArrowRight className="w-4 h-4 text-slate-600 shrink-0" />}
      </div>

      {/* Value */}
      <div className="mt-4">
        <div className={cn("font-mono tabular-nums font-semibold text-slate-100", large ? "text-2xl" : "text-xl")}>
          {hasData ? formatCurrency(bucket.totalValue!) : "—"}
        </div>
        <div className="flex items-center gap-2 mt-1">
          {hasData && bucket.totalGainLoss !== null && (
            <>
              <span
                className={cn(
                  "text-xs font-mono tabular-nums",
                  isPositive ? "text-emerald-400" : "text-red-400"
                )}
              >
                {isPositive ? "+" : ""}
                {formatCurrency(bucket.totalGainLoss)}
              </span>
              <span
                className={cn(
                  "text-xs font-mono tabular-nums px-1.5 py-0.5 rounded-full",
                  isPositive
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "bg-red-500/15 text-red-400"
                )}
              >
                {formatPercent(bucket.totalGainLossPct ?? 0)}
              </span>
            </>
          )}
          {!hasData && bucket.positions.length === 0 && (
            <span className="text-xs text-slate-600">No positions</span>
          )}
        </div>
      </div>

      {/* Cost basis row */}
      {bucket.totalCostBasis > 0 && (
        <div className="mt-3 pt-3 border-t text-xs text-slate-500 flex justify-between"
          style={{ borderColor: "#1f2a44" }}>
          <span>Cost basis</span>
          <span className="font-mono tabular-nums text-slate-400">
            {formatCurrency(bucket.totalCostBasis)}
          </span>
        </div>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{card}</Link>;
  }
  return card;
}
