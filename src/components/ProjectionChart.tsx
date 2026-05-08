"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { RothSettings, EnrichedBucket } from "@/lib/types";
import { formatCurrency } from "@/lib/format";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b"];

function rateKey(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

// Defined at module level to satisfy react-hooks/static-components
interface ProjectionTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: number;
}
function ProjectionTooltip({ active, payload, label }: ProjectionTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg border px-3 py-2 text-sm"
      style={{ backgroundColor: "#131c2f", borderColor: "#1f2a44" }}
    >
      <div className="text-xs text-slate-500 mb-2">Age {label}</div>
      {payload.map((item) => (
        <div key={item.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
          <span className="text-slate-400 text-xs">{item.name}</span>
          <span className="font-mono tabular-nums text-slate-100 text-xs ml-auto">
            {formatCurrency(item.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

interface ProjectionChartProps {
  bucket: EnrichedBucket;
  settings: RothSettings;
}

export default function ProjectionChart({ bucket, settings }: ProjectionChartProps) {
  const currentValue = bucket.totalValue ?? bucket.totalCostBasis;
  const years = settings.retirementAge - settings.currentAge;

  const data: Record<string, number | string>[] = [];
  for (let y = 0; y <= years; y++) {
    const age = settings.currentAge + y;
    const point: Record<string, number | string> = { age };
    for (const rate of settings.projectionRates) {
      let value = currentValue;
      for (let i = 0; i < y; i++) {
        value = value * (1 + rate) + settings.annualContributionLimit;
      }
      point[rateKey(rate)] = Math.round(value);
    }
    data.push(point);
  }

  const formatY = (v: number) => {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
    return `$${v}`;
  };

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2a44" />
        <XAxis
          dataKey="age"
          tick={{ fill: "#64748b", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          label={{ value: "Age", position: "insideBottom", offset: -2, fill: "#64748b", fontSize: 11 }}
        />
        <YAxis
          tickFormatter={formatY}
          tick={{ fill: "#64748b", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={55}
        />
        <Tooltip content={<ProjectionTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11, color: "#64748b" }} />
        {settings.projectionRates.map((rate, idx) => (
          <Line
            key={rate}
            type="monotone"
            dataKey={rateKey(rate)}
            stroke={COLORS[idx]}
            strokeWidth={2}
            dot={false}
            name={rateKey(rate)}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
