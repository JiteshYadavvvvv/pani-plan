"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Reveal } from "@/lib/motion/Reveal";
import { Section } from "@/components/ui/Section";

export function Intro() {
  const { t } = useLanguage();

  return (
    <Section tone="ivory" className="py-24 sm:py-32">
      <div className="mx-auto max-w-3xl text-center">
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-gold">
            {t("home.intro.eyebrow")}
          </p>
        </Reveal>
        <Reveal delay={0.08}>
          <h2 className="mt-4 font-display text-4xl font-semibold leading-tight sm:text-5xl">
            {t("home.intro.title")}
          </h2>
        </Reveal>
        <Reveal delay={0.16}>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted">
            {t("home.intro.body")}
          </p>
        </Reveal>
      </div>
    </Section>
  );
}
