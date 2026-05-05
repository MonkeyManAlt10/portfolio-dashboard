import { cn } from "@/lib/utils";
import { formatPercent, formatCurrency } from "@/lib/format";

interface GainLossBadgeProps {
  value: number | null;
  pct?: number | null;
  showDollar?: boolean;
  size?: "sm" | "md";
}

export default function GainLossBadge({
  value,
  pct,
  showDollar = false,
  size = "sm",
}: GainLossBadgeProps) {
  if (value === null) {
    return <span className="text-slate-500 text-xs">—</span>;
  }

  const isPositive = value >= 0;
  const colorClass = isPositive ? "text-emerald-400" : "text-red-400";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <span className={cn("font-mono tabular-nums", textSize, colorClass)}>
      {showDollar && `${isPositive ? "+" : ""}${formatCurrency(value)} `}
      {pct !== undefined && pct !== null && formatPercent(pct)}
    </span>
  );
}
