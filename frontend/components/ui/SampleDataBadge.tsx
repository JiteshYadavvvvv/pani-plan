"use client";

import { BookOpen } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Badge } from "./Badge";

export function SampleDataBadge({ className }: { className?: string }) {
  const { t } = useLanguage();
  return (
    <Badge tone="low" className={className}>
      <BookOpen className="h-3.5 w-3.5" />
      {t("common.sampleDataShort")}
    </Badge>
  );
}
