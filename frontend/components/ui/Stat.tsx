import { clsx } from "clsx";

export function Stat({
  value,
  label,
  tone = "light",
  className,
}: {
  value: string;
  label: string;
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <div className={clsx("flex flex-col gap-1", className)}>
      <span
        className={clsx(
          "tabular-nums font-display text-4xl font-semibold sm:text-5xl",
          tone === "light" ? "text-ivory" : "text-forest"
        )}
      >
        {value}
      </span>
      <span
        className={clsx(
          "text-sm",
          tone === "light" ? "text-sage-light" : "text-muted"
        )}
      >
        {label}
      </span>
    </div>
  );
}
