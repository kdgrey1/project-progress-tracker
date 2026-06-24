import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  className?: string;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

export function ProgressBar({
  value,
  className,
  showLabel = true,
  size = "md",
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  const color =
    clamped === 100
      ? "bg-green-500"
      : clamped >= 60
      ? "bg-blue-500"
      : clamped >= 30
      ? "bg-amber-500"
      : "bg-slate-300";

  const height =
    size === "sm" ? "h-1.5" : size === "lg" ? "h-3" : "h-2";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className={cn(
          "flex-1 bg-slate-100 rounded-full overflow-hidden",
          height
        )}
      >
        <div
          className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-medium text-slate-600 w-9 text-right tabular-nums">
          {clamped}%
        </span>
      )}
    </div>
  );
}
