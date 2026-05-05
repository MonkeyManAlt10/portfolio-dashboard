import { cn } from "@/lib/utils";

interface StatProps {
  label: string;
  value: string;
  subValue?: string;
  trend?: "up" | "down" | "neutral";
  mono?: boolean;
  size?: "sm" | "md" | "lg";
}

export default function Stat({
  label,
  value,
  subValue,
  trend,
  mono = true,
  size = "md",
}: StatProps) {
  const trendColor =
    trend === "up"
      ? "text-emerald-400"
      : trend === "down"
      ? "text-red-400"
      : "text-slate-400";

  const sizeMap = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-4xl",
  };

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">
        {label}
      </span>
      <span
        className={cn(
          "font-semibold text-slate-100",
          sizeMap[size],
          mono && "font-mono tabular-nums",
          trend && trendColor
        )}
      >
        {value}
      </span>
      {subValue && (
        <span className={cn("text-sm", trendColor, mono && "font-mono")}>
          {subValue}
        </span>
      )}
    </div>
  );
}
