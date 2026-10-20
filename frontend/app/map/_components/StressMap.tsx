"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
import { Sprout } from "lucide-react";
import type { WaterStressMapPoint } from "@/lib/api/schemas";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { TranslationKey } from "@/lib/i18n/en";

type StressLevel = WaterStressMapPoint["stress_level"];

const STRESS_COLORS: Record<StressLevel, string> = {
  low: "#3f7a4c",
  moderate: "#a06c15",
  high: "#a3511f",
  severe: "#8c2a20",
};

const STRESS_LABEL_KEYS: Record<StressLevel, TranslationKey> = {
  low: "stress.low",
  moderate: "stress.moderate",
  high: "stress.high",
  severe: "stress.severe",
};

function markerRadius(stressIndex: number): number {
  const clamped = Math.min(100, Math.max(0, stressIndex));
  return 8 + (clamped / 100) * 16;
}

function FlyToSelected({ point }: { point: WaterStressMapPoint | null }) {
  const map = useMap();

  useEffect(() => {
    if (!point) return;
    map.flyTo([point.lat, point.lng], Math.max(map.getZoom(), 6.2), { duration: 0.8 });
  }, [point, map]);

  return null;
}

export function StressMap({
  points,
  selectedDistrictId,
  onSelectDistrict,
  cropNameById,
}: {
  points: WaterStressMapPoint[];
  selectedDistrictId: string | null;
  onSelectDistrict: (districtId: string) => void;
  cropNameById: Map<string, string>;
}) {
  const { t } = useLanguage();
  const selectedPoint = points.find((point) => point.district_id === selectedDistrictId) ?? null;

  return (
    <MapContainer
      center={[22.5, 79]}
      zoom={4.6}
      scrollWheelZoom
      className="h-full w-full"
      attributionControl
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FlyToSelected point={selectedPoint} />
      {points.map((point) => (
        <CircleMarker
          key={point.district_id}
          center={[point.lat, point.lng]}
          radius={markerRadius(point.stress_index)}
          pathOptions={{
            color: STRESS_COLORS[point.stress_level],
            fillColor: STRESS_COLORS[point.stress_level],
            fillOpacity: point.district_id === selectedDistrictId ? 0.8 : 0.55,
            weight: point.district_id === selectedDistrictId ? 3 : 1.5,
          }}
          eventHandlers={{
            click: () => onSelectDistrict(point.district_id),
          }}
        >
          <Tooltip direction="top" offset={[0, -4]} opacity={1}>
            <span className="font-sans text-xs font-medium text-ink">
              {point.name} · {point.state}
            </span>
          </Tooltip>
          <Popup>
            <div className="min-w-[200px] font-sans">
              <p className="font-semibold text-ink">
                {point.name}
                <span className="ml-1.5 font-normal text-muted">· {point.state}</span>
              </p>
              <p className="mt-1.5 text-sm font-medium" style={{ color: STRESS_COLORS[point.stress_level] }}>
                {t(STRESS_LABEL_KEYS[point.stress_level])} · {point.stress_index}/100
              </p>
              {point.primary_crops.length > 0 ? (
                <p className="mt-1.5 flex items-start gap-1.5 text-xs text-muted">
                  <Sprout className="mt-0.5 h-3.5 w-3.5 shrink-0 text-forest" />
                  {point.primary_crops.map((id) => cropNameById.get(id) ?? id).join(", ")}
                </p>
              ) : null}
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
