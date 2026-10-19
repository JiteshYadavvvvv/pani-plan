"use client";

import { Droplets, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { clsx } from "clsx";
import { useLanguage, type Locale } from "@/lib/i18n/LanguageProvider";
import type { TranslationKey } from "@/lib/i18n/en";
import { Container } from "../ui/Container";
import { LinkButton } from "../ui/Button";

const navLinks: { href: string; labelKey: TranslationKey }[] = [
  { href: "/advisory", labelKey: "nav.advisory" },
  { href: "/dashboard", labelKey: "nav.dashboard" },
  { href: "/explore", labelKey: "nav.explore" },
  { href: "/map", labelKey: "nav.map" },
  { href: "/lab", labelKey: "nav.lab" },
  { href: "/benchmarks", labelKey: "nav.benchmarks" },
  { href: "/how-it-works", labelKey: "nav.howItWorks" },
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

  return (
    <header className="sticky top-0 z-50 border-b border-earth-light bg-ivory/95 backdrop-blur">
      <Container>
        <div className="flex items-center justify-between py-3">
          <Link href="/" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
            <Droplets className="h-6 w-6 text-forest" strokeWidth={2.25} />
            <span className="font-display text-xl font-semibold text-forest">
              {t("brand.name")}
            </span>
          </Link>

          <nav className="hidden items-center gap-6 lg:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  "text-sm font-medium transition-colors hover:text-forest",
                  pathname === link.href ? "text-forest" : "text-ink/80"
                )}
              >
                {t(link.labelKey)}
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
              <Link
                href="/about"
                onClick={() => setMobileOpen(false)}
                className="rounded px-3 py-2.5 text-sm font-medium text-ink/80"
              >
                {t("nav.about")}
              </Link>
              <Link
                href="/faq"
                onClick={() => setMobileOpen(false)}
                className="rounded px-3 py-2.5 text-sm font-medium text-ink/80"
              >
                {t("nav.faq")}
              </Link>
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
