"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Reveal } from "@/lib/motion/Reveal";
import { Section } from "@/components/ui/Section";
import { Accordion } from "@/components/ui/Accordion";

export default function FaqPage() {
  const { t } = useLanguage();

  const items = [
    { question: t("faq.q1.q"), answer: t("faq.q1.a") },
    { question: t("faq.q2.q"), answer: t("faq.q2.a") },
    { question: t("faq.q3.q"), answer: t("faq.q3.a") },
    { question: t("faq.q4.q"), answer: t("faq.q4.a") },
    { question: t("faq.q5.q"), answer: t("faq.q5.a") },
    { question: t("faq.q6.q"), answer: t("faq.q6.a") },
  ];

  return (
    <Section tone="ivory" className="pt-16">
      <Reveal>
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-gold">
          {t("faq.hero.eyebrow")}
        </p>
        <h1 className="mt-4 font-display text-4xl font-semibold sm:text-5xl">
          {t("faq.hero.title")}
        </h1>
      </Reveal>
      <Reveal delay={0.1} className="mt-10">
        <Accordion items={items} />
      </Reveal>
    </Section>
  );
}
