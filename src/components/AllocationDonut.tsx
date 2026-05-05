"use client";

import { useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { EnrichedBucket } from "@/lib/types";
import { formatCurrency, formatPercent } from "@/lib/format";

interface TooltipItem {
  name?: string;
  value?: number;
}

// Defined at module level to satisfy react-hooks/static-components
function AllocationTooltip({
  active,
  payload,
  grandTotal,
}: {
  active?: boolean;
  payload?: readonly TooltipItem[];
  grandTotal: number | null;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const val = item.value ?? 0;
  const pct = grandTotal ? (val / grandTotal) * 100 : 0;
  return (
    <div
      className="rounded-lg border px-3 py-2 text-sm"
      style={{ backgroundColor: "#131c2f", borderColor: "#1f2a44" }}
    >
      <div className="font-medium text-slate-200">{item.name}</div>
      <div className="font-mono tabular-nums text-slate-300 mt-0.5">
        {formatCurrency(val)}
      </div>
      <div className="font-mono tabular-nums text-slate-500 text-xs">
        {formatPercent(pct)} of total
      </div>
    </div>
  );
}

interface AllocationDonutProps {
  buckets: EnrichedBucket[];
  grandTotal: number | null;
}

export default function AllocationDonut({ buckets, grandTotal }: AllocationDonutProps) {
  const data = buckets
    .filter((b) => b.totalValue && b.totalValue > 0)
    .map((b) => ({ name: b.name, value: b.totalValue!, color: b.color }));

  const renderTooltip = useMemo(
    () =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (props: any) =>
        AllocationTooltip({ active: props.active, payload: props.payload, grandTotal }),
    [grandTotal]
  );

  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-slate-600 text-sm">
        No data yet
      </div>
    );
  }

  return (
    <div className="relative h-56">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, idx) => (
              <Cell key={idx} fill={entry.color} stroke="transparent" />
            ))}
          </Pie>
          <Tooltip content={renderTooltip} />
        </PieChart>
      </ResponsiveContainer>

      {grandTotal !== null && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="text-xs text-slate-500 uppercase tracking-wider">Total</div>
          <div className="text-xl font-mono tabular-nums font-semibold text-slate-100 mt-0.5">
            {formatCurrency(grandTotal)}
          </div>
        </div>
      )}
    </div>
  );
}
