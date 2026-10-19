"use client";

import { ArrowRight, Cpu, Grid3x3, Zap } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Reveal } from "@/lib/motion/Reveal";
import { Section } from "@/components/ui/Section";
import { LinkButton } from "@/components/ui/Button";

export function ComputingEngine() {
  const { t } = useLanguage();

  const modes = [
    { icon: Cpu, label: t("home.engine.modeSerial") },
    { icon: Grid3x3, label: t("home.engine.modeMulti") },
    { icon: Zap, label: t("home.engine.modeVector") },
  ];

  return (
    <Section tone="forest">
      <div className="grid gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <Reveal>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-gold-light">
              {t("home.engine.eyebrow")}
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold leading-tight sm:text-4xl">
              {t("home.engine.title")}
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-sage-light">
              {t("home.engine.body")}
            </p>
            <div className="mt-8">
              <LinkButton href="/lab" variant="onDark">
                {t("home.engine.cta")}
              </LinkButton>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="flex items-center justify-center gap-3 sm:gap-5">
            {modes.map((mode, index) => (
              <div key={mode.label} className="flex items-center gap-3 sm:gap-5">
                <div className="flex flex-col items-center gap-3 rounded border border-ivory/20 bg-forest-dark/60 px-5 py-6 sm:px-6">
                  <mode.icon className="h-7 w-7 text-gold-light" strokeWidth={1.75} />
                  <span className="text-sm font-medium text-ivory">{mode.label}</span>
                </div>
                {index < modes.length - 1 ? (
                  <ArrowRight className="h-5 w-5 flex-none text-ivory/40" />
                ) : null}
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
