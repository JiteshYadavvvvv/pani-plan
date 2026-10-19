"use client";

import { Droplets } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Container } from "../ui/Container";

const productLinks = [
  { href: "/advisory", labelKey: "nav.advisory" as const },
  { href: "/dashboard", labelKey: "nav.dashboard" as const },
  { href: "/explore", labelKey: "nav.explore" as const },
  { href: "/map", labelKey: "nav.map" as const },
];

const resourceLinks = [
  { href: "/lab", labelKey: "nav.lab" as const },
  { href: "/benchmarks", labelKey: "nav.benchmarks" as const },
  { href: "/how-it-works", labelKey: "nav.howItWorks" as const },
  { href: "/faq", labelKey: "nav.faq" as const },
];

const projectLinks = [{ href: "/about", labelKey: "nav.about" as const }];

export function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="border-t border-earth-light bg-cream">
      <Container>
        <div className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
          <div className="max-w-xs">
            <div className="flex items-center gap-2">
              <Droplets className="h-5 w-5 text-forest" />
              <span className="font-display text-lg font-semibold text-forest">
                {t("brand.name")}
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted">{t("footer.tagline")}</p>
          </div>

          <FooterColumn titleKey="footer.product" links={productLinks} />
          <FooterColumn titleKey="footer.resources" links={resourceLinks} />
          <FooterColumn titleKey="footer.project" links={projectLinks} />
        </div>

        <div className="border-t border-earth-light py-6">
          <p className="text-xs leading-relaxed text-muted">{t("footer.sampleDataNotice")}</p>
          <p className="mt-2 text-xs text-muted">
            &copy; {new Date().getFullYear()} {t("footer.rights")}
          </p>
        </div>
      </Container>
    </footer>
  );
}

function FooterColumn({
  titleKey,
  links,
}: {
  titleKey: "footer.product" | "footer.resources" | "footer.project";
  links: { href: string; labelKey: Parameters<ReturnType<typeof useLanguage>["t"]>[0] }[];
}) {
  const { t } = useLanguage();
  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-wide text-forest">{t(titleKey)}</p>
      <ul className="mt-4 flex flex-col gap-2.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="text-sm text-muted hover:text-forest">
              {t(link.labelKey)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
