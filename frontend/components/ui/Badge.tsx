import { clsx } from "clsx";

type Tone = "neutral" | "gold" | "low" | "moderate" | "high" | "severe";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-sage-light text-forest-dark border-earth-light",
  gold: "bg-gold-light text-forest-dark border-gold",
  low: "bg-stress-low-bg text-stress-low border-stress-low-border",
  moderate: "bg-stress-moderate-bg text-stress-moderate border-stress-moderate-border",
  high: "bg-stress-high-bg text-stress-high border-stress-high-border",
  severe: "bg-stress-severe-bg text-stress-severe border-stress-severe-border",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide",
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function stressTone(level: "low" | "moderate" | "high" | "severe"): Tone {
  return level;
}
