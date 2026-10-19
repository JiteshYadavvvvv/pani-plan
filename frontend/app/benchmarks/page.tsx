"use client";

import { useCallback, useState } from "react";
import { AlertTriangle, Cpu, Gauge, Play } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Reveal } from "@/lib/motion/Reveal";
import { Section, SectionHeading } from "@/components/ui/Section";
import { Card } from "@/components/ui/Card";
import { Button, LinkButton } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { fetchBenchmark, ApiError } from "@/lib/api/client";
import type { BenchmarkResponse } from "@/lib/api/schemas";
import { AmdahlChart, type AmdahlChartCopy } from "./_components/AmdahlChart";

const EXAMPLE_WORKLOAD_SIZE = 15000;

type RunState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; data: BenchmarkResponse };

interface SerialFractionCopy {
  high: string;
  low: string;
  mid: string;
}

function serialFractionInterpretation(fraction: number, copy: SerialFractionCopy): string {
  if (fraction >= 0.95) return copy.high;
  if (fraction <= 0.3) return copy.low;
  return copy.mid;
}

const copy = {
  en: {
    hero: {
      eyebrow: "Amdahl's Law",
      title: "Why more cores don't always mean proportionally more speed",
      body: "Amdahl's Law says the speedup you can get from parallelising a task is bounded by the fraction of that task which cannot be parallelised at all. However many workers you add, the part that must run sequentially sets a ceiling on how fast the whole job can go.",
    },
    formulaLabel: "The formula",
    formulaBody: "speedup(p) = 1 / (s + (1 − s) / p)",
    formulaExplain: "p is the number of workers, s is the serial fraction — the share of the work that gains nothing from extra cores. As p grows, the best possible speedup approaches 1 / s.",
    runEyebrow: "Live measurement",
    runTitle: "Run the example benchmark",
    runBody: `Runs the same real server-side computation as the Parallel Lab at a fixed workload size of ${EXAMPLE_WORKLOAD_SIZE.toLocaleString("en-IN")}, large enough to usually show real multi-core speedup.`,
    runButton: "Run example benchmark",
    runningButton: "Running on the server…",
    empty: {
      title: "No measurement yet",
      body: "Run the example benchmark to see the theoretical Amdahl curve plotted against real measured points from this server, right now.",
    },
    loading: "Running the serial loop, the multiprocess pool, and the vectorised pass on the server…",
    resultsEyebrow: "Measured just now",
    hostLine: "Host:",
    coreWord: "cores",
    workloadLine: "Workload size:",
    serialFractionLabel: "Estimated serial fraction",
    serialFraction: {
      high: "This came back at ≈ 1.0 — at this workload size, the fixed cost of spawning worker processes outweighed the parallel work, so no benefit was measurable. That's expected at small sizes, not an error.",
      low: "This is low — most of the batch parallelises cleanly, so adding cores keeps paying off close to linearly.",
      mid: "A meaningful share of the work is inherently sequential, so each extra core helps less than the one before it — exactly what the formula above predicts.",
    } satisfies SerialFractionCopy,
    chart: {
      theoreticalSeries: "Theoretical speedup (Amdahl fit)",
      measuredSeries: "Measured speedup",
      workersAxis: "Workers",
      speedupAxis: "Speedup (×)",
      baselineLabel: "No speedup",
    } satisfies AmdahlChartCopy,
    chartCaption: "The line is the theoretical curve least-squares fit to the measured multiprocess points; the dots are what the server actually measured on this run. How closely the dots track the line is the fit quality.",
    caveatTitle: "Why a small workload can show \"no benefit\"",
    caveatBody: "Spinning up a worker process has a fixed cost — it is not free, and it does not shrink as the workload shrinks. At small workload sizes, that fixed overhead can exceed the time saved by splitting the work across cores, so measured multiprocess runs come back slower than the serial loop and the fitted serial fraction saturates at 1.0. This is a real, honest measurement, not a bug — it is Amdahl's Law accounting for overhead, not just for the algorithm's parallel structure. Increase the workload size in the Parallel Lab to watch the curve bend the other way.",
    labCtaHeading: "Want to find that overhead-vs-speedup crossover yourself?",
    labCtaButton: "Open the Parallel Lab",
  },
  hi: {
    hero: {
      eyebrow: "एम्डाल का नियम (Amdahl's Law)",
      title: "ज़्यादा कोर हमेशा उसी अनुपात में ज़्यादा स्पीड क्यों नहीं देते",
      body: "एम्डाल का नियम कहता है कि किसी काम को पैरलल करने से मिलने वाला स्पीडअप, उस काम के उस हिस्से से सीमित होता है जिसे बिल्कुल भी पैरलल नहीं किया जा सकता। आप चाहे कितने भी वर्कर जोड़ दें, जो हिस्सा क्रम से (सीक्वेंशियली) ही चलना है, वही पूरे काम की अधिकतम गति तय कर देता है।",
    },
    formulaLabel: "फॉर्मूला",
    formulaBody: "speedup(p) = 1 / (s + (1 − s) / p)",
    formulaExplain: "यहाँ p वर्करों की संख्या है, s सीरियल फ्रैक्शन है — काम का वह हिस्सा जिसे ज़्यादा कोर से कोई फायदा नहीं मिलता। p बढ़ने पर, अधिकतम संभव स्पीडअप 1 / s के करीब पहुंचता है।",
    runEyebrow: "लाइव माप",
    runTitle: "उदाहरण बेंचमार्क चलाएं",
    runBody: `यह पैरलल लैब जैसी ही वास्तविक सर्वर-साइड गणना को ${EXAMPLE_WORKLOAD_SIZE.toLocaleString("en-IN")} के एक निश्चित वर्कलोड आकार पर चलाता है, जो आमतौर पर वास्तविक मल्टी-कोर स्पीडअप दिखाने के लिए पर्याप्त बड़ा है।`,
    runButton: "उदाहरण बेंचमार्क चलाएं",
    runningButton: "सर्वर पर चल रहा है…",
    empty: {
      title: "अभी तक कोई माप नहीं",
      body: "सैद्धांतिक एम्डाल कर्व को इस सर्वर से अभी मापे गए वास्तविक बिंदुओं के सामने देखने के लिए उदाहरण बेंचमार्क चलाएं।",
    },
    loading: "सर्वर पर सीरियल लूप, मल्टीप्रोसेस पूल और वेक्टराइज़्ड पास चल रहे हैं…",
    resultsEyebrow: "अभी-अभी मापा गया",
    hostLine: "होस्ट:",
    coreWord: "कोर",
    workloadLine: "वर्कलोड आकार:",
    serialFractionLabel: "अनुमानित सीरियल फ्रैक्शन",
    serialFraction: {
      high: "यह ≈ 1.0 आया — इस वर्कलोड आकार पर, वर्कर प्रोसेस शुरू करने की तय लागत पैरलल काम से ज़्यादा रही, इसलिए कोई मापने योग्य फायदा नहीं दिखा। छोटे आकार पर यह अनुमानित है, कोई गड़बड़ी नहीं।",
      low: "यह कम है — अधिकतर बैच साफ़-साफ़ पैरलल हो जाता है, इसलिए कोर जोड़ना लगभग रेखीय ढंग से फायदा देता रहता है।",
      mid: "काम का एक बड़ा हिस्सा स्वाभाविक रूप से सीक्वेंशियल है, इसलिए हर अतिरिक्त कोर पिछले से कम फायदा देता है — ठीक वैसा जैसा ऊपर का फॉर्मूला बताता है।",
    } satisfies SerialFractionCopy,
    chart: {
      theoreticalSeries: "सैद्धांतिक स्पीडअप (एम्डाल फिट)",
      measuredSeries: "मापा गया स्पीडअप",
      workersAxis: "वर्कर",
      speedupAxis: "स्पीडअप (×)",
      baselineLabel: "कोई स्पीडअप नहीं",
    } satisfies AmdahlChartCopy,
    chartCaption: "रेखा वह सैद्धांतिक कर्व है जो मापे गए मल्टीप्रोसेस बिंदुओं पर लीस्ट-स्क्वेयर्स से फिट की गई है; बिंदु वही हैं जो सर्वर ने इस रन में वास्तव में मापे। बिंदु रेखा के कितने करीब हैं, यही फिट की गुणवत्ता बताता है।",
    caveatTitle: "छोटा वर्कलोड \"कोई फायदा नहीं\" क्यों दिखा सकता है",
    caveatBody: "वर्कर प्रोसेस शुरू करने की एक तय लागत होती है — यह मुफ़्त नहीं है, और वर्कलोड छोटा होने पर यह लागत कम नहीं होती। छोटे वर्कलोड आकार पर, यह तय ओवरहेड काम को कोर में बांटने से बचाए गए समय से ज़्यादा हो सकता है, इसलिए मापा गया मल्टीप्रोसेस रन सीरियल लूप से भी धीमा आता है और फिट किया गया सीरियल फ्रैक्शन 1.0 पर पहुंच जाता है। यह एक वास्तविक, ईमानदार माप है, कोई बग नहीं — यह एम्डाल का नियम है जो सिर्फ एल्गोरिथम की पैरलल संरचना नहीं, बल्कि ओवरहेड को भी हिसाब में लेता है। पैरलल लैब में वर्कलोड आकार बढ़ाकर देखें कि कर्व कैसे पलट जाता है।",
    labCtaHeading: "यह ओवरहेड-बनाम-स्पीडअप मोड़ खुद ढूंढना चाहते हैं?",
    labCtaButton: "पैरलल लैब खोलें",
  },
} as const;

export default function BenchmarksPage() {
  const { locale, t } = useLanguage();
  const c = copy[locale];

  const [runState, setRunState] = useState<RunState>({ status: "idle" });
  const isLoading = runState.status === "loading";

  const runExampleBenchmark = useCallback(async () => {
    setRunState({ status: "loading" });
    try {
      const data = await fetchBenchmark({ workload_size: EXAMPLE_WORKLOAD_SIZE });
      setRunState({ status: "success", data });
    } catch (error) {
      const message =
        error instanceof ApiError && error.status === 0
          ? t("common.error.network")
          : t("common.error.generic");
      setRunState({ status: "error", message });
    }
  }, [t]);

  return (
    <>
      <Section tone="forest" className="pb-16 pt-16">
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-gold-light">
            {c.hero.eyebrow}
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-tight sm:text-5xl">
            {c.hero.title}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-sage-light">{c.hero.body}</p>
        </Reveal>
      </Section>

      <Section tone="ivory">
        <Reveal>
          <Card className="bg-forest text-ivory">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-light">
              {c.formulaLabel}
            </p>
            <p className="mt-3 font-display text-2xl font-semibold tabular-nums sm:text-3xl">
              {c.formulaBody}
            </p>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-sage-light">{c.formulaExplain}</p>
          </Card>
        </Reveal>

        <Reveal delay={0.06}>
          <Card className="mt-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">
                  {c.runEyebrow}
                </p>
                <h2 className="mt-2 font-display text-xl font-semibold">{c.runTitle}</h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">{c.runBody}</p>
              </div>
              <div className="flex items-center gap-3">
                <Button type="button" onClick={runExampleBenchmark} disabled={isLoading} size="lg">
                  <Play className="h-5 w-5" strokeWidth={1.75} />
                  {isLoading ? c.runningButton : c.runButton}
                </Button>
                {isLoading ? <Spinner /> : null}
              </div>
            </div>
          </Card>
        </Reveal>

        <div className="mt-8">
          {runState.status === "idle" ? (
            <Card className="border-dashed text-center">
              <h3 className="font-display text-lg font-semibold">{c.empty.title}</h3>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted">{c.empty.body}</p>
            </Card>
          ) : null}

          {runState.status === "loading" ? (
            <Card className="flex flex-col items-center gap-4 text-center">
              <Spinner className="h-8 w-8" />
              <p className="max-w-xl text-sm leading-relaxed text-muted">{c.loading}</p>
            </Card>
          ) : null}

          {runState.status === "error" ? (
            <ErrorNotice message={runState.message} onRetry={runExampleBenchmark} />
          ) : null}

          {runState.status === "success" ? (
            <div className="space-y-6">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-gold">
                {c.resultsEyebrow}
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Card className="flex items-center gap-3">
                  <Cpu className="h-6 w-6 shrink-0 text-forest" strokeWidth={1.75} />
                  <p className="text-sm text-muted">
                    {c.hostLine}{" "}
                    <span className="tabular-nums font-display text-lg font-semibold text-ink">
                      {runState.data.cpu_count}
                    </span>{" "}
                    {c.coreWord}
                  </p>
                </Card>
                <Card className="flex items-center gap-3">
                  <Gauge className="h-6 w-6 shrink-0 text-forest" strokeWidth={1.75} />
                  <p className="text-sm text-muted">
                    {c.workloadLine}{" "}
                    <span className="tabular-nums font-display text-lg font-semibold text-ink">
                      {runState.data.workload_size.toLocaleString("en-IN")}
                    </span>
                  </p>
                </Card>
              </div>

              <Card>
                <AmdahlChart
                  amdahlCurve={runState.data.amdahl_curve}
                  measuredPoints={runState.data.results
                    .filter((entry) => entry.mode === "multiprocess")
                    .map((entry) => ({ workers: entry.workers, speedup: entry.speedup }))}
                  copy={c.chart}
                />
                <p className="mt-3 text-sm leading-relaxed text-muted">{c.chartCaption}</p>
              </Card>

              <Card className="bg-sage-light">
                <p className="text-sm font-semibold text-forest-dark">{c.serialFractionLabel}</p>
                <p className="mt-1 tabular-nums font-display text-3xl font-semibold text-forest-dark">
                  {runState.data.estimated_serial_fraction.toFixed(2)}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-ink">
                  {serialFractionInterpretation(runState.data.estimated_serial_fraction, c.serialFraction)}
                </p>
              </Card>
            </div>
          ) : null}
        </div>
      </Section>

      <Section tone="sage">
        <Reveal>
          <Card className="bg-surface">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 shrink-0 text-gold" strokeWidth={1.75} />
              <h2 className="font-display text-xl font-semibold">{c.caveatTitle}</h2>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted">{c.caveatBody}</p>
          </Card>
        </Reveal>
      </Section>

      <Section tone="forest">
        <Reveal>
          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
            <SectionHeading title={c.labCtaHeading} className="max-w-xl" />
            <LinkButton href="/lab" size="lg">
              {c.labCtaButton}
            </LinkButton>
          </div>
        </Reveal>
      </Section>
    </>
  );
}
