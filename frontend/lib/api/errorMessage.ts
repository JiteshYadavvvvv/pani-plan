import type { TranslationKey } from "@/lib/i18n/en";
import type { ApiErrorCategory } from "./client";

const keyByCategory: Record<ApiErrorCategory, TranslationKey> = {
  config: "common.error.config",
  network: "common.error.network",
  validation: "common.error.validation",
  http: "common.error.http",
  unknown: "common.error.generic",
};

export function apiErrorMessageKey(category: ApiErrorCategory): TranslationKey {
  return keyByCategory[category];
}
