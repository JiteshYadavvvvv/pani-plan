import { clsx } from "clsx";
import { Container } from "./Container";

export function Section({
  children,
  className,
  id,
  tone = "ivory",
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
  tone?: "ivory" | "forest" | "sage" | "surface";
}) {
  const toneClasses: Record<string, string> = {
    ivory: "bg-ivory text-ink",
    forest: "bg-forest text-ivory",
    sage: "bg-sage-light text-ink",
    surface: "bg-surface text-ink",
  };
  return (
    <section id={id} className={clsx("py-20 sm:py-28", toneClasses[tone], className)}>
      <Container>{children}</Container>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  body,
  align = "left",
  className,
}: {
  eyebrow?: string;
  title: string;
  body?: string;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "max-w-2xl",
        align === "center" && "mx-auto text-center",
        className
      )}
    >
      {eyebrow ? (
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-gold">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-3xl font-semibold leading-tight sm:text-4xl">{title}</h2>
      {body ? <p className="mt-4 text-lg leading-relaxed text-muted">{body}</p> : null}
    </div>
  );
}
