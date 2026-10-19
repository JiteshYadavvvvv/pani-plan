"use client";

import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export function Hero() {
  const { t } = useLanguage();
  const sectionRef = useRef<HTMLElement>(null);
  const imageWrapRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLAnchorElement>(null);
  const secondaryRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const imageWrap = imageWrapRef.current;
    const headline = headlineRef.current;
    const subtitle = subtitleRef.current;
    const actions = actionsRef.current;
    if (!imageWrap || !headline || !subtitle || !actions) return;

    if (prefersReducedMotion) {
      gsap.set([imageWrap, headline, subtitle, actions], { clearProps: "all" });
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.fromTo(
      imageWrap,
      { clipPath: "inset(0 0 0 100%)", scale: 1.06 },
      { clipPath: "inset(0 0 0 0%)", scale: 1, duration: 1.2 }
    )
      .fromTo(headline, { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.7 }, 0.45)
      .fromTo(subtitle, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.6 }, 0.6)
      .fromTo(actions, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.6 }, 0.72);

    const parallax = gsap.to(imageWrap, {
      yPercent: 10,
      ease: "none",
      scrollTrigger: {
        trigger: sectionRef.current,
        start: "top top",
        end: "bottom top",
        scrub: true,
      },
    });

    return () => {
      tl.kill();
      parallax.scrollTrigger?.kill();
      parallax.kill();
    };
  }, []);

  const handleHover = (ref: React.RefObject<HTMLElement>, hovering: boolean) => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion || !ref.current) return;
    gsap.to(ref.current, { scale: hovering ? 1.045 : 1, duration: 0.25, ease: "power2.out" });
  };

  return (
    <section
      ref={sectionRef}
      className="relative flex h-[94vh] min-h-[640px] w-full items-end overflow-hidden bg-forest-dark sm:items-center"
    >
      <div ref={imageWrapRef} className="absolute inset-0">
        <Image
          src="/images/hero-farmer-original.jpg"
          alt="A farmer standing in a lush green field"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[85%_15%] sm:object-[62%_20%]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-forest-dark/95 via-forest-dark/60 to-forest-dark/10" />
        <div className="absolute inset-0 bg-gradient-to-t from-forest-dark/95 via-forest-dark/35 to-transparent sm:from-forest-dark/60" />
        <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-forest-dark via-forest-dark/85 to-transparent sm:hidden" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-5 pb-14 sm:px-8 sm:pb-0">
        <div className="max-w-xl">
          <h1
            ref={headlineRef}
            className="font-display text-5xl font-semibold leading-[1.05] text-ivory drop-shadow-sm sm:text-6xl"
          >
            {t("home.hero.title")}
          </h1>
          <p
            ref={subtitleRef}
            className="mt-6 max-w-md text-lg leading-relaxed text-sage-light drop-shadow-sm"
          >
            {t("home.hero.subtitle")}
          </p>
          <div ref={actionsRef} className="mt-10 flex flex-wrap items-center gap-6">
            <Link
              ref={primaryRef}
              href="/advisory"
              onMouseEnter={() => handleHover(primaryRef, true)}
              onMouseLeave={() => handleHover(primaryRef, false)}
              className="inline-flex items-center gap-2 rounded bg-gold px-7 py-4 text-base font-medium text-forest-dark transition-colors hover:bg-gold-light"
            >
              {t("home.hero.ctaPrimary")}
            </Link>
            <Link
              ref={secondaryRef}
              href="/how-it-works"
              onMouseEnter={() => handleHover(secondaryRef, true)}
              onMouseLeave={() => handleHover(secondaryRef, false)}
              className="group relative inline-flex items-center gap-2 text-base font-medium text-ivory"
            >
              {t("home.hero.ctaSecondary")}
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              <span className="absolute -bottom-1 left-0 h-px w-0 bg-ivory transition-all duration-300 group-hover:w-full" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
