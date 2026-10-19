"use client";

import { useCallback, useState } from "react";
import { Cpu, FlaskConical, Gauge, Info, TimerReset } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Reveal } from "@/lib/motion/Reveal";
import { Section, SectionHeading } from "@/components/ui/Section";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { LinkButton } from "@/components/ui/Button";
import { fetchBenchmark, ApiError } from "@/lib/api/client";
import type { BenchmarkRequest, BenchmarkResponse } from "@/lib/api/schemas";
import { LabControls, type LabControlsCopy } from "./_components/LabControls";
import { ModeLegend, SpeedupChart, TimeComparisonChart, buildChartRows } from "./_components/BenchmarkCharts";

type RunState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; data: BenchmarkResponse };

const copy = {
  en: {
    hero: {
      eyebrow: "Parallel Processing Lab",
      title: "Trigger a real multi-core benchmark, right now",
      body: "Press run and the server executes the same batch irrigation calculation three separate times — once as a plain single-core loop, once spread across multiple worker processes, and once as a NumPy-vectorised pass — and times each one live with a hardware clock. Nothing here is a pre-recorded animation.",
    },
    controls: {
      workloadLabel: "Workload size",
      workloadHint: "Number of synthetic field calculations in one batch. Larger batches give parallelism more room to pay off; smaller ones expose process-spawn overhead.",
      maxWorkersLabel: "Max workers (optional)",
      maxWorkersHint: "Leave blank to let the server pick worker counts based on its own CPU count.",
      maxWorkersAuto: "Auto",
      runButton: "Run benchmark",
      runningButton: "Running on the server…",
    } satisfies LabControlsCopy,
    empty: {
      title: "Nothing has run yet",
      body: "When you press \"Run benchmark\", the backend spins up real worker processes, runs the serial loop, the multiprocess pool, and the vectorised pass, and reports exactly how long each one took on this request.",
    },
    loading: "Computing on the server — serial loop, worker pool, and vectorised pass are running now…",
    resultsEyebrow: "Measured just now",
    hostLine: "Measured on a",
    coreWord: "core host",
    workloadWord: "workload size",
    timeChartTitle: "Wall-clock time by mode",
    speedupChartTitle: "Speedup relative to the serial loop",
    baselineLabel: "No speedup (1×)",
    secondsUnit: "seconds",
    speedupUnit: "Speedup",
    serialFractionLabel: "Estimated serial fraction (Amdahl fit)",
    serialFractionHighNote: "At this workload size, process-spawn overhead outweighs the parallel work, so the fit reports no measurable benefit (serial fraction ≈ 1.0). That's a correct, honest result, not a bug — try a larger workload size to see it flip.",
    serialFractionLowNote: "A low serial fraction means most of the batch parallelises cleanly — adding cores keeps paying off.",
    serialFractionMidNote: "A meaningful share of the work is inherently sequential, so returns from extra cores taper off — exactly what Amdahl's Law predicts.",
    legend: {
      serial: "Serial (1 core)",
      multiprocess: "Multiprocess (ProcessPoolExecutor)",
      vectorized: "Vectorized (NumPy)",
    },
    chart: {
      serialShort: "Serial",
      vectorizedShort: "Vectorized",
      workersUnit: "workers",
    },
    deepDive: {
      body: "Want the full Amdahl's Law explainer with the theoretical curve plotted against these measurements?",
      cta: "Open the Benchmarks page",
    },
  },
  hi: {
    hero: {
      eyebrow: "पैरलल प्रोसेसिंग लैब",
      title: "अभी एक वास्तविक मल्टी-कोर बेंचमार्क चलाएं",
      body: "\"Run\" दबाते ही सर्वर एक ही बैच सिंचाई गणना को तीन अलग-अलग तरीकों से चलाता है — एक सीधा सिंगल-कोर लूप, कई वर्कर प्रोसेस में बंटा हुआ एक रन, और एक NumPy-वेक्टराइज़्ड पास — और हर एक को हार्डवेयर क्लॉक से लाइव टाइम करता है। यहाँ कुछ भी पहले से रिकॉर्ड किया हुआ एनिमेशन नहीं है।",
    },
    controls: {
      workloadLabel: "वर्कलोड का आकार",
      workloadHint: "एक बैच में सिंथेटिक खेत-गणनाओं की संख्या। बड़ा बैच पैरललिज़्म को फायदा दिखाने का मौका देता है; छोटा बैच वर्कर-प्रोसेस शुरू करने के ओवरहेड को उजागर करता है।",
      maxWorkersLabel: "अधिकतम वर्कर (वैकल्पिक)",
      maxWorkersHint: "खाली छोड़ें तो सर्वर अपने CPU कोर की संख्या के आधार पर वर्कर काउंट खुद चुन लेगा।",
      maxWorkersAuto: "ऑटो",
      runButton: "बेंचमार्क चलाएं",
      runningButton: "सर्वर पर चल रहा है…",
    } satisfies LabControlsCopy,
    empty: {
      title: "अभी तक कोई रन नहीं हुआ",
      body: "\"बेंचमार्क चलाएं\" दबाने पर बैकएंड वास्तविक वर्कर प्रोसेस शुरू करता है, सीरियल लूप, मल्टीप्रोसेस पूल और वेक्टराइज़्ड पास चलाता है, और इस रिक्वेस्ट में हर एक को कितना समय लगा, वह सटीक बताता है।",
    },
    loading: "सर्वर पर गणना हो रही है — सीरियल लूप, वर्कर पूल और वेक्टराइज़्ड पास अभी चल रहे हैं…",
    resultsEyebrow: "अभी-अभी मापा गया",
    hostLine: "मापा गया, एक",
    coreWord: "कोर होस्ट पर",
    workloadWord: "वर्कलोड आकार",
    timeChartTitle: "मोड अनुसार वॉल-क्लॉक समय",
    speedupChartTitle: "सीरियल लूप की तुलना में स्पीडअप",
    baselineLabel: "कोई स्पीडअप नहीं (1×)",
    secondsUnit: "सेकंड",
    speedupUnit: "स्पीडअप",
    serialFractionLabel: "अनुमानित सीरियल फ्रैक्शन (एम्डाल फिट)",
    serialFractionHighNote: "इस वर्कलोड आकार पर, वर्कर-प्रोसेस शुरू करने का ओवरहेड पैरलल काम से ज़्यादा है, इसलिए फिट कोई मापने योग्य फायदा नहीं दिखाता (सीरियल फ्रैक्शन ≈ 1.0)। यह एक सही, ईमानदार परिणाम है, बग नहीं — बड़ा वर्कलोड आकार आज़माकर इसे पलटते देखें।",
    serialFractionLowNote: "कम सीरियल फ्रैक्शन का मतलब है कि अधिकतर बैच साफ़-साफ़ पैरलल हो जाता है — ज़्यादा कोर जोड़ना फायदा देता रहता है।",
    serialFractionMidNote: "काम का एक बड़ा हिस्सा स्वाभाविक रूप से क्रमिक (सीक्वेंशियल) है, इसलिए अतिरिक्त कोर से मिलने वाला फायदा घटता जाता है — ठीक वैसा जैसा एम्डाल का नियम बताता है।",
    legend: {
      serial: "सीरियल (1 कोर)",
      multiprocess: "मल्टीप्रोसेस (ProcessPoolExecutor)",
      vectorized: "वेक्टराइज़्ड (NumPy)",
    },
    chart: {
      serialShort: "सीरियल",
      vectorizedShort: "वेक्टराइज़्ड",
      workersUnit: "वर्कर",
    },
    deepDive: {
      body: "इन्हीं मापों के सामने सैद्धांतिक एम्डाल कर्व के साथ पूरा स्पष्टीकरण देखना चाहते हैं?",
      cta: "बेंचमार्क पेज खोलें",
    },
  },
} as const;

interface SerialFractionCopy {
  serialFractionHighNote: string;
  serialFractionLowNote: string;
  serialFractionMidNote: string;
}

function serialFractionNote(fraction: number, c: SerialFractionCopy): string {
  if (fraction >= 0.95) return c.serialFractionHighNote;
  if (fraction <= 0.3) return c.serialFractionLowNote;
  return c.serialFractionMidNote;
}

export default function LabPage() {
  const { locale, t } = useLanguage();
  const c = copy[locale];

  const [workloadSize, setWorkloadSize] = useState(15000);
  const [maxWorkersInput, setMaxWorkersInput] = useState("");
  const [runState, setRunState] = useState<RunState>({ status: "idle" });

  const runBenchmark = useCallback(async () => {
    setRunState({ status: "loading" });
    const parsedMaxWorkers = maxWorkersInput.trim() === "" ? undefined : Number(maxWorkersInput);
    const payload: BenchmarkRequest =
      parsedMaxWorkers !== undefined && Number.isFinite(parsedMaxWorkers)
        ? { workload_size: workloadSize, max_workers: parsedMaxWorkers }
        : { workload_size: workloadSize };
    try {
      const data = await fetchBenchmark(payload);
      setRunState({ status: "success", data });
    } catch (error) {
      const message =
        error instanceof ApiError && error.status === 0
          ? t("common.error.network")
          : t("common.error.generic");
      setRunState({ status: "error", message });
    }
  }, [workloadSize, maxWorkersInput, t]);

  const isLoading = runState.status === "loading";
  const chartRows =
    runState.status === "success"
      ? buildChartRows(runState.data.results, {
          serial: c.chart.serialShort,
          vectorized: c.chart.vectorizedShort,
          workers: c.chart.workersUnit,
        })
      : [];

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
          <Card>
            <div className="flex items-center gap-3">
              <FlaskConical className="h-6 w-6 text-forest" strokeWidth={1.75} />
              <h2 className="font-display text-xl font-semibold">{c.hero.eyebrow}</h2>
            </div>
            <div className="mt-6">
              <LabControls
                copy={c.controls}
                workloadSize={workloadSize}
                onWorkloadSizeChange={setWorkloadSize}
                maxWorkers={maxWorkersInput}
                onMaxWorkersChange={setMaxWorkersInput}
                onRun={runBenchmark}
                isLoading={isLoading}
              />
            </div>
          </Card>
        </Reveal>

        <div className="mt-8">
          {runState.status === "idle" ? (
            <Card className="border-dashed text-center">
              <Info className="mx-auto h-6 w-6 text-earth" strokeWidth={1.75} />
              <h3 className="mt-3 font-display text-lg font-semibold">{c.empty.title}</h3>
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
            <ErrorNotice message={runState.message} onRetry={runBenchmark} />
          ) : null}

          {runState.status === "success" ? (
            <div className="space-y-8">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-gold">
                {c.resultsEyebrow}
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
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
                    {c.workloadWord}:{" "}
                    <span className="tabular-nums font-display text-lg font-semibold text-ink">
                      {runState.data.workload_size.toLocaleString("en-IN")}
                    </span>
                  </p>
                </Card>
                <Card className="flex items-center gap-3">
                  <TimerReset className="h-6 w-6 shrink-0 text-forest" strokeWidth={1.75} />
                  <p className="text-sm text-muted">
                    {c.serialFractionLabel}:{" "}
                    <span className="tabular-nums font-display text-lg font-semibold text-ink">
                      {runState.data.estimated_serial_fraction.toFixed(2)}
                    </span>
                  </p>
                </Card>
              </div>

              <p className="text-sm leading-relaxed text-muted">
                {serialFractionNote(runState.data.estimated_serial_fraction, c)}
              </p>

              <Card>
                <h3 className="font-display text-lg font-semibold">{c.timeChartTitle}</h3>
                <div className="mt-4">
                  <TimeComparisonChart rows={chartRows} secondsUnitLabel={c.secondsUnit} />
                </div>
                <div className="mt-2">
                  <ModeLegend
                    items={[
                      { mode: "serial", label: c.legend.serial },
                      { mode: "multiprocess", label: c.legend.multiprocess },
                      { mode: "vectorized", label: c.legend.vectorized },
                    ]}
                  />
                </div>
              </Card>

              <Card>
                <h3 className="font-display text-lg font-semibold">{c.speedupChartTitle}</h3>
                <div className="mt-4">
                  <SpeedupChart rows={chartRows} baselineLabel={c.baselineLabel} speedupUnitLabel={c.speedupUnit} />
                </div>
              </Card>
            </div>
          ) : null}
        </div>
      </Section>

      <Section tone="sage">
        <Reveal>
          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
            <SectionHeading title={c.deepDive.body} className="max-w-xl" />
            <LinkButton href="/benchmarks" variant="primary">
              {c.deepDive.cta}
            </LinkButton>
          </div>
        </Reveal>
      </Section>
    </>
  );
}
