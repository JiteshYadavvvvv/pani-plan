"use client";

import { AlertTriangle } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Button } from "./Button";

export function ErrorNotice({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col items-start gap-3 rounded border border-stress-severe-border bg-stress-severe-bg p-5">
      <div className="flex items-center gap-2 text-stress-severe">
        <AlertTriangle className="h-5 w-5" />
        <p className="text-sm font-semibold">{message ?? t("common.error.generic")}</p>
      </div>
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {t("common.retry")}
        </Button>
      ) : null}
    </div>
  );
}
