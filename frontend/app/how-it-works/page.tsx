"use client";

import { Cloud, Cpu, Droplets, Gauge, Layers, Server } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Reveal } from "@/lib/motion/Reveal";
import { Section, SectionHeading } from "@/components/ui/Section";
import { Card } from "@/components/ui/Card";

export default function HowItWorksPage() {
  const { t } = useLanguage();

  const steps = [
    { icon: Layers, title: t("howItWorks.step1.title"), body: t("howItWorks.step1.body") },
    { icon: Cloud, title: t("howItWorks.step2.title"), body: t("howItWorks.step2.body") },
    { icon: Droplets, title: t("howItWorks.step3.title"), body: t("howItWorks.step3.body") },
    { icon: Gauge, title: t("howItWorks.step4.title"), body: t("howItWorks.step4.body") },
  ];

  return (
    <>
      <Section tone="forest" className="pb-16 pt-16">
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-gold-light">
            {t("howItWorks.hero.eyebrow")}
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-tight sm:text-5xl">
            {t("howItWorks.hero.title")}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-sage-light">
            {t("howItWorks.hero.subtitle")}
          </p>
        </Reveal>
      </Section>

      <Section tone="ivory">
        <div className="grid gap-6 sm:grid-cols-2">
          {steps.map((step, index) => (
            <Reveal key={step.title} delay={index * 0.06}>
              <Card className="h-full">
                <step.icon className="h-7 w-7 text-forest" strokeWidth={1.75} />
                <h3 className="mt-5 font-display text-xl font-semibold">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">{step.body}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section tone="sage">
        <Reveal>
          <SectionHeading eyebrow={t("howItWorks.stack.eyebrow")} title={t("howItWorks.stack.title")} />
        </Reveal>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <Reveal>
            <Card className="h-full bg-surface">
              <Server className="h-7 w-7 text-forest" strokeWidth={1.75} />
              <h3 className="mt-5 font-display text-xl font-semibold">
                {t("howItWorks.stack.frontend.title")}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                {t("howItWorks.stack.frontend.body")}
              </p>
            </Card>
          </Reveal>
          <Reveal delay={0.08}>
            <Card className="h-full bg-surface">
              <Cpu className="h-7 w-7 text-forest" strokeWidth={1.75} />
              <h3 className="mt-5 font-display text-xl font-semibold">
                {t("howItWorks.stack.backend.title")}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                {t("howItWorks.stack.backend.body")}
              </p>
            </Card>
          </Reveal>
        </div>
      </Section>

      <Section tone="forest">
        <Reveal>
          <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-gold-light">
                {t("howItWorks.lab.eyebrow")}
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">
                {t("howItWorks.lab.title")}
              </h2>
            </div>
            <p className="text-lg leading-relaxed text-sage-light">{t("howItWorks.lab.body")}</p>
          </div>
        </Reveal>
      </Section>
    </>
  );
}
