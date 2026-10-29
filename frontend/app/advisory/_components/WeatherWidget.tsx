"use client";

import { useCallback, useEffect, useState } from "react";
import { CloudRain, Sparkles, Thermometer, Wind } from "lucide-react";
import { ApiError, fetchWeather, fetchWeatherAdvisory } from "@/lib/api/client";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import type { WeatherAdvisoryResponse, WeatherResponse } from "@/lib/api/schemas";

function formatFetchedAt(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm} UTC`;
}

export function WeatherWidget({
  districtId,
  cropName,
  onUseLiveWeather,
}: {
  districtId: string | undefined;
  cropName?: string;
  onUseLiveWeather: (tmax: number, tmin: number, rainfall7d: number) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weather, setWeather] = useState<WeatherResponse | null>(null);

  const [advisoryLoading, setAdvisoryLoading] = useState(false);
  const [advisory, setAdvisory] = useState<WeatherAdvisoryResponse | null>(null);
  const [showAdvisory, setShowAdvisory] = useState(false);

  const load = useCallback((id: string) => {
    setLoading(true);
    setError(null);
    setWeather(null);
    setAdvisory(null);
    setShowAdvisory(false);
    fetchWeather(id)
      .then((data) => {
        setWeather(data);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.kind === "config") {
          setError("Live weather not configured.");
        } else {
          setError("Live weather unavailable.");
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleGetAdvisory = useCallback(() => {
    if (!districtId) return;
    setAdvisoryLoading(true);
    setShowAdvisory(true);
    fetchWeatherAdvisory({
      district_id: districtId,
      crop_name: cropName,
    })
      .then((data) => {
        setAdvisory(data);
      })
      .catch(() => {})
      .finally(() => {
        setAdvisoryLoading(false);
      });
  }, [districtId, cropName]);

  useEffect(() => {
    if (!districtId) {
      setWeather(null);
      setError(null);
      return;
    }
    load(districtId);
  }, [districtId, load]);

  if (!districtId) return null;

  if (loading) {
    return (
      <div className="rounded border border-earth-light bg-surface p-4 text-sm">
        <div className="flex items-center gap-2 text-muted">
          <Spinner className="h-4 w-4" />
          <span>Fetching live weather from Open-Meteo…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded border border-earth-light bg-surface p-4 text-sm">
        <div className="flex items-center justify-between gap-3">
          <p className="text-muted">{error}</p>
          <Button variant="ghost" size="sm" onClick={() => districtId && load(districtId)}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!weather) return null;

  const today = weather.forecast[0];
  const totalRain7d = weather.forecast.reduce((acc, f) => acc + (f.precipitation_mm || 0), 0);
  const avgMaxTemp =
    weather.forecast.reduce((acc, f) => acc + (f.temp_max_c || 0), 0) / (weather.forecast.length || 1);
  const avgMinTemp =
    weather.forecast.reduce((acc, f) => acc + (f.temp_min_c || 0), 0) / (weather.forecast.length || 1);

  return (
    <div className="rounded-lg border border-earth-light bg-surface p-4 sm:p-5 text-sm shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded border border-earth-light bg-sage-light px-2 py-0.5 text-xs font-semibold text-forest-dark">
              Open-Meteo · 7-Day Numerical Forecast
            </span>
            <span className="text-xs text-muted">as of {formatFetchedAt(weather.fetched_at)}</span>
          </div>

          <div className="mt-3 flex flex-wrap gap-5">
            <div>
              <p className="text-xs text-muted">Current Temp</p>
              <p className="font-display text-lg font-semibold text-ink">
                {weather.current.temperature_c.toFixed(1)}°C
              </p>
            </div>
            <div>
              <p className="text-xs text-muted">7-Day Rainfall Sum</p>
              <p className="font-display text-lg font-semibold text-forest flex items-center gap-1">
                <CloudRain className="h-4 w-4 text-forest" />
                {totalRain7d.toFixed(1)} mm
              </p>
            </div>
            <div>
              <p className="text-xs text-muted">7-Day Avg Temp</p>
              <p className="font-display text-lg font-semibold text-ink flex items-center gap-1">
                <Thermometer className="h-4 w-4 text-muted" />
                {avgMaxTemp.toFixed(1)}° / {avgMinTemp.toFixed(1)}°C
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {today ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onUseLiveWeather(avgMaxTemp, avgMinTemp, totalRain7d)}
            >
              Apply Live Forecast
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGetAdvisory}
            className="flex items-center gap-1 border border-earth-light"
          >
            <Sparkles className="h-3.5 w-3.5 text-gold" />
            Weather AI Advisory
          </Button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-4 sm:grid-cols-7 gap-1.5 pt-3 border-t border-earth-light/60">
        {weather.forecast.slice(0, 7).map((day) => {
          const dateLabel = new Date(day.date).toLocaleDateString("en-US", { weekday: "short" });
          return (
            <div key={day.date} className="rounded bg-sand/30 p-1.5 text-center text-xs">
              <span className="font-medium text-ink block">{dateLabel}</span>
              <span className="text-[11px] text-muted block">
                {day.temp_max_c.toFixed(0)}° / {day.temp_min_c.toFixed(0)}°
              </span>
              <span className="font-semibold text-forest text-[11px] block mt-0.5">
                {day.precipitation_mm.toFixed(1)} mm
              </span>
            </div>
          );
        })}
      </div>

      {showAdvisory ? (
        <div className="mt-4 rounded border border-earth-light bg-ivory p-3.5 text-xs text-ink">
          {advisoryLoading ? (
            <div className="flex items-center gap-2 text-muted py-2">
              <Spinner className="h-4 w-4" />
              <span>Analyzing agrometeorological risks with Gemini AI…</span>
            </div>
          ) : advisory ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2 border-b border-earth-light/60 pb-1.5">
                <span className="font-semibold text-forest text-sm">{advisory.summary_headline}</span>
                <span className="rounded bg-sage-light px-2 py-0.5 text-[10px] font-medium text-forest-dark">
                  {advisory.provider}
                </span>
              </div>
              <p className="leading-relaxed">
                <strong className="text-forest-dark">Rainfall Impact:</strong> {advisory.rainfall_analysis}
              </p>
              <p className="leading-relaxed">
                <strong className="text-forest-dark">Heat Stress:</strong> {advisory.heat_stress_assessment}
              </p>
              <div className="rounded bg-sand/40 p-2 border-l-2 border-forest mt-1">
                <strong className="text-forest-dark block mb-0.5">Irrigation Guidance:</strong>
                {advisory.irrigation_recommendation}
              </div>
              <p className="text-[11px] text-muted mt-1">
                Next review recommended: {advisory.next_review_date}. {advisory.uncertainty_note}
              </p>
            </div>
          ) : (
            <p className="text-muted">Weather advisory could not be loaded. Please retry.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
