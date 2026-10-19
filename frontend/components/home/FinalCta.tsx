"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Reveal } from "@/lib/motion/Reveal";
import { Section } from "@/components/ui/Section";
import { LinkButton } from "@/components/ui/Button";

export function FinalCta() {
  const { t } = useLanguage();

  return (
    <Section tone="sage" className="py-24 sm:py-32">
      <Reveal>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">
            {t("home.cta.title")}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted">{t("home.cta.body")}</p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <LinkButton href="/advisory" size="lg">
              {t("home.cta.button")}
            </LinkButton>
            <LinkButton href="/dashboard" variant="secondary" size="lg">
              {t("home.finalCta.secondary")}
            </LinkButton>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
