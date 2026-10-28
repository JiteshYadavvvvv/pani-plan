"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, fetchWeather } from "@/lib/api/client";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import type { WeatherResponse } from "@/lib/api/schemas";

function formatFetchedAt(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm} UTC`;
}

export function WeatherWidget({
  districtId,
  onUseLiveWeather,
}: {
  districtId: string | undefined;
  onUseLiveWeather: (tmax: number, tmin: number, rainfall7d: number) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weather, setWeather] = useState<WeatherResponse | null>(null);

  const load = useCallback((id: string) => {
    setLoading(true);
    setError(null);
    setWeather(null);
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
          <span>Fetching live weather…</span>
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

  return (
    <div className="rounded border border-earth-light bg-surface p-4 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded border border-earth-light bg-sage-light px-2 py-0.5 text-xs font-semibold text-forest-dark">
              Open-Meteo · live forecast
            </span>
            <span className="text-xs text-muted">as of {formatFetchedAt(weather.fetched_at)}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-4">
            <div>
              <p className="text-xs text-muted">Now</p>
              <p className="font-semibold text-ink">{weather.current.temperature_c.toFixed(1)}°C</p>
            </div>
            {today ? (
              <>
                <div>
                  <p className="text-xs text-muted">Today max / min</p>
                  <p className="font-semibold text-ink">
                    {today.temp_max_c.toFixed(1)}° / {today.temp_min_c.toFixed(1)}°C
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted">Forecast rain today</p>
                  <p className="font-semibold text-ink">{today.precipitation_mm.toFixed(1)} mm</p>
                </div>
              </>
            ) : null}
          </div>
        </div>
        {today ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              onUseLiveWeather(today.temp_max_c, today.temp_min_c, today.precipitation_mm * 7)
            }
          >
            Use live weather
          </Button>
        ) : null}
      </div>
      {today ? (
        <p className="mt-2 text-xs text-muted">
          7-day rainfall approximated as today&apos;s forecast × 7 ({(today.precipitation_mm * 7).toFixed(1)} mm)
        </p>
      ) : null}
    </div>
  );
}
