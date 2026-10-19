"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { clsx } from "clsx";

export function Disclosure({
  label,
  defaultOpen = false,
  children,
}: {
  label: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 py-1 text-left"
      >
        <span className="text-sm font-semibold text-forest-dark">{label}</span>
        <ChevronDown
          className={clsx(
            "h-4 w-4 flex-none text-forest transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>
      <div
        className={clsx(
          "grid overflow-hidden transition-all duration-300 ease-out",
          open ? "mt-3 grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="min-h-0">{children}</div>
      </div>
    </div>
  );
}
