"use client";

import { Calculator, MessageCircleMore, Thermometer } from "lucide-react";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Section, SectionHeading } from "@/components/ui/Section";

export function HowItWorks() {
  const { t } = useLanguage();
  const sectionRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const copyRefs = useRef<(HTMLDivElement | null)[]>([]);

  const steps = [
    {
      icon: Thermometer,
      title: t("home.steps.step1.title"),
      body: t("home.steps.step1.body"),
    },
    {
      icon: Calculator,
      title: t("home.steps.step2.title"),
      body: t("home.steps.step2.body"),
    },
    {
      icon: MessageCircleMore,
      title: t("home.steps.step3.title"),
      body: t("home.steps.step3.body"),
    },
  ];

  useEffect(() => {
    const section = sectionRef.current;
    const line = lineRef.current;
    const nodes = nodeRefs.current.filter(Boolean) as HTMLDivElement[];
    const copies = copyRefs.current.filter(Boolean) as HTMLDivElement[];
    if (!section || !line || nodes.length !== 3 || copies.length !== 3) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      gsap.set([line, ...nodes, ...copies], { clearProps: "all" });
      return;
    }

    gsap.registerPlugin(ScrollTrigger);
    gsap.set(line, { scaleX: 0, transformOrigin: "left center" });
    gsap.set(nodes, { scale: 0.4, opacity: 0 });
    gsap.set(copies, { opacity: 0, y: 20 });

    const tl = gsap.timeline({
      scrollTrigger: { trigger: section, start: "top 70%", toggleActions: "play none none none" },
      defaults: { ease: "power3.out" },
    });
    tl.to(line, { scaleX: 1, duration: 1 })
      .to(nodes, { scale: 1, opacity: 1, duration: 0.5, stagger: 0.25, ease: "back.out(2)" }, 0.1)
      .to(copies, { opacity: 1, y: 0, duration: 0.6, stagger: 0.25 }, 0.3);

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, []);

  return (
    <Section tone="sage">
      <SectionHeading eyebrow={t("home.steps.eyebrow")} title={t("home.steps.title")} align="center" />

      <div ref={sectionRef} className="relative mt-20">
        <div className="absolute left-0 right-0 top-6 hidden h-px bg-earth-light sm:block">
          <div ref={lineRef} className="h-full w-full bg-forest" />
        </div>

        <div className="grid gap-12 sm:grid-cols-3 sm:gap-8">
          {steps.map((step, index) => (
            <div key={step.title}>
              <div
                ref={(el) => {
                  nodeRefs.current[index] = el;
                }}
                className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 border-forest bg-ivory font-display text-sm font-semibold text-forest"
              >
                0{index + 1}
              </div>
              <div
                ref={(el) => {
                  copyRefs.current[index] = el;
                }}
                className={index === 1 ? "mt-5 sm:mt-14" : "mt-5"}
              >
                <step.icon className="h-6 w-6 text-forest" strokeWidth={1.75} />
                <h3 className="mt-3 font-display text-xl font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
                {index === 2 ? (
                  <div className="mt-4 inline-flex flex-col gap-1 rounded border border-forest/20 bg-surface px-4 py-3">
                    <span className="text-xs uppercase tracking-wide text-muted">
                      {t("home.steps.step3.sampleLabel")}
                    </span>
                    <span className="font-display text-base font-semibold tabular-nums text-forest">
                      {t("home.steps.step3.sample")}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
