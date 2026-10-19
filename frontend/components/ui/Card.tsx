import { clsx } from "clsx";

export function Card({
  children,
  className,
  padded = true,
}: {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={clsx(
        "rounded-lg border border-earth-light bg-surface",
        padded && "p-6 sm:p-8",
        className
      )}
    >
      {children}
    </div>
  );
}
