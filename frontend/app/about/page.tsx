"use client";

import { CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Reveal } from "@/lib/motion/Reveal";
import { Section, SectionHeading } from "@/components/ui/Section";
import { Card } from "@/components/ui/Card";

export default function AboutPage() {
  const { t } = useLanguage();

  const honestPoints = [t("about.scope.honest1"), t("about.scope.honest2"), t("about.scope.honest3")];

  return (
    <>
      <Section tone="forest" className="pb-16 pt-16">
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-gold-light">
            {t("about.hero.eyebrow")}
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-tight sm:text-5xl">
            {t("about.hero.title")}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-sage-light">
            {t("about.hero.subtitle")}
          </p>
        </Reveal>
      </Section>

      <Section tone="ivory">
        <div className="grid gap-12 lg:grid-cols-2">
          <Reveal>
            <div>
              <h2 className="font-display text-2xl font-semibold">{t("about.mission.title")}</h2>
              <p className="mt-4 text-lg leading-relaxed text-muted">{t("about.mission.body")}</p>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div>
              <h2 className="font-display text-2xl font-semibold">{t("about.methodology.title")}</h2>
              <p className="mt-4 text-lg leading-relaxed text-muted">{t("about.methodology.body")}</p>
            </div>
          </Reveal>
        </div>
      </Section>

      <Section tone="sage">
        <Reveal>
          <SectionHeading title={t("about.scope.title")} />
        </Reveal>
        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {honestPoints.map((point, index) => (
            <Reveal key={point} delay={index * 0.08}>
              <Card className="h-full bg-surface">
                <CheckCircle2 className="h-6 w-6 text-forest" strokeWidth={1.75} />
                <p className="mt-4 text-sm leading-relaxed text-ink">{point}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </Section>
    </>
  );
}
