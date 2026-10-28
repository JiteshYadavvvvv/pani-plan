"use client";

import { Droplets, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import gsap from "gsap";
import { useLanguage, type Locale } from "@/lib/i18n/LanguageProvider";
import type { TranslationKey } from "@/lib/i18n/en";
import { Container } from "../ui/Container";
import { LinkButton } from "../ui/Button";

const navLinks: { href: string; labelKey: TranslationKey }[] = [
  { href: "/", labelKey: "nav.home" },
  { href: "/how-it-works", labelKey: "nav.howItWorks" },
  { href: "/advisory", labelKey: "nav.advisory" },
  { href: "/crop-analysis", labelKey: "nav.cropAnalysis" },
  { href: "/fisheries", labelKey: "nav.fisheries" },
  { href: "/lab", labelKey: "nav.lab" },
  { href: "/about", labelKey: "nav.about" },
];

function LanguageToggle() {
  const { locale, setLocale, t } = useLanguage();
  const options: Locale[] = ["en", "hi"];
  return (
    <div
      className="flex items-center rounded border border-earth-light bg-surface p-0.5"
      role="group"
      aria-label={t("language.toggleLabel")}
    >
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setLocale(option)}
          aria-pressed={locale === option}
          className={clsx(
            "rounded px-2.5 py-1 text-xs font-semibold transition-colors",
            locale === option ? "bg-forest text-ivory" : "text-muted hover:text-ink"
          )}
        >
          {option === "en" ? t("language.english") : t("language.hindi")}
        </button>
      ))}
    </div>
  );
}

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { t } = useLanguage();
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = headerRef.current;
    if (!element) return;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;
    const tween = gsap.fromTo(
      element,
      { opacity: 0, y: -16 },
      { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }
    );
    return () => {
      tween.kill();
    };
  }, []);

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-50 border-b border-earth-light bg-ivory/95 backdrop-blur"
    >
      <Container>
        <div className="flex items-center justify-between py-3">
          <Link href="/" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
            <Droplets className="h-6 w-6 text-forest" strokeWidth={2.25} />
            <span className="font-display text-xl font-semibold text-forest">
              {t("brand.name")}
            </span>
          </Link>

          <nav className="hidden items-center gap-7 lg:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  "group relative py-1 text-sm font-medium transition-colors hover:text-forest",
                  pathname === link.href ? "text-forest" : "text-ink/80"
                )}
              >
                {t(link.labelKey)}
                <span
                  className={clsx(
                    "absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-forest transition-transform duration-300 ease-out group-hover:scale-x-100",
                    pathname === link.href && "scale-x-100"
                  )}
                />
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <LanguageToggle />
            <LinkButton href="/advisory" size="sm">
              {t("nav.getAdvisory")}
            </LinkButton>
          </div>

          <button
            type="button"
            className="flex items-center justify-center rounded border border-earth-light p-2 lg:hidden"
            onClick={() => setMobileOpen((open) => !open)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? t("nav.closeMenu") : t("nav.openMenu")}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </Container>

      {mobileOpen ? (
        <div className="border-t border-earth-light bg-ivory lg:hidden">
          <Container>
            <nav className="flex flex-col gap-1 py-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={clsx(
                    "rounded px-3 py-2.5 text-sm font-medium",
                    pathname === link.href ? "bg-sage-light text-forest" : "text-ink/80"
                  )}
                >
                  {t(link.labelKey)}
                </Link>
              ))}
            </nav>
            <div className="flex items-center justify-between gap-3 border-t border-earth-light py-4">
              <LanguageToggle />
              <LinkButton href="/advisory" size="sm" className="flex-1 justify-center">
                {t("nav.getAdvisory")}
              </LinkButton>
            </div>
          </Container>
        </div>
      ) : null}
    </header>
  );
}
