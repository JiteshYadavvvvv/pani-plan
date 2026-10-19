"use client";

import { Calculator, Cpu, Layers, Map as MapIcon, Sprout, Thermometer } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Reveal } from "@/lib/motion/Reveal";
import { Section, SectionHeading } from "@/components/ui/Section";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { Hero } from "@/components/home/Hero";

export default function HomePage() {
  const { t } = useLanguage();

  const pillars = [
    {
      icon: Sprout,
      title: t("home.pillars.advisory.title"),
      body: t("home.pillars.advisory.body"),
    },
    {
      icon: MapIcon,
      title: t("home.pillars.insight.title"),
      body: t("home.pillars.insight.body"),
    },
    {
      icon: Cpu,
      title: t("home.pillars.hpc.title"),
      body: t("home.pillars.hpc.body"),
    },
  ];

  const scienceSteps = [
    { icon: Thermometer, text: t("home.science.step1") },
    { icon: Layers, text: t("home.science.step2") },
    { icon: Calculator, text: t("home.science.step3") },
  ];

  return (
    <>
      <Hero />

      <Section tone="ivory">
        <Reveal>
          <SectionHeading
            eyebrow={t("home.pillars.eyebrow")}
            title={t("home.pillars.title")}
          />
        </Reveal>
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {pillars.map((pillar, index) => (
            <Reveal key={pillar.title} delay={index * 0.08}>
              <Card className="h-full">
                <pillar.icon className="h-8 w-8 text-forest" strokeWidth={1.75} />
                <h3 className="mt-5 font-display text-xl font-semibold">{pillar.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">{pillar.body}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section tone="sage">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-gold">
                {t("home.science.eyebrow")}
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold leading-tight sm:text-4xl">
                {t("home.science.title")}
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-muted">{t("home.science.body")}</p>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <Card className="bg-surface">
              <ul className="flex flex-col gap-5">
                {scienceSteps.map((step) => (
                  <li key={step.text} className="flex items-start gap-4">
                    <span className="flex h-10 w-10 flex-none items-center justify-center rounded border border-forest/20 bg-ivory">
                      <step.icon className="h-5 w-5 text-forest" />
                    </span>
                    <span className="pt-2 text-sm font-medium text-ink">{step.text}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </Reveal>
        </div>
      </Section>

      <Section tone="forest">
        <Reveal>
          <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
            <div>
              <h2 className="font-display text-3xl font-semibold sm:text-4xl">
                {t("home.cta.title")}
              </h2>
              <p className="mt-3 max-w-xl text-lg text-sage-light">{t("home.cta.body")}</p>
            </div>
            <LinkButton href="/advisory" variant="onDark" size="lg">
              {t("home.cta.button")}
            </LinkButton>
          </div>
        </Reveal>
      </Section>
    </>
  );
}
