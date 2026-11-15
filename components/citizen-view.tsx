"use client";

import { useCallback, useEffect, useState } from "react";
import { CityMap } from "@/components/city-map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { t } from "@/lib/i18n";
import type { MapData, NearestShelter, Zone } from "@/lib/types";
import { cn } from "@/lib/utils";

type Origin = { lat: number; lng: number };

function pctColor(pct: number) {
  if (pct >= 90) return "bg-red-500";
  if (pct >= 70) return "bg-amber-500";
  return "bg-emerald-500";
}

function formatDistance(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`;
}

export function CitizenView() {
  const [map, setMap] = useState<MapData | null>(null);
  const [mapError, setMapError] = useState(false);
  const [zones, setZones] = useState<Zone[]>([]);
  const [zoneId, setZoneId] = useState<string>("");
  const [origin, setOrigin] = useState<Origin | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationNote, setLocationNote] = useState(false);
  const [shelters, setShelters] = useState<NearestShelter[] | null>(null);
  const [sheltersError, setSheltersError] = useState(false);

  const loadMap = useCallback(() => {
    setMapError(false);
    api
      .getMap()
      .then(setMap)
      .catch(() => setMapError(true));
  }, []);

  useEffect(() => {
    loadMap();
    api
      .getZones()
      .then(setZones)
      .catch(() => setZones([]));
  }, [loadMap]);

  const loadShelters = useCallback((o: Origin) => {
    setSheltersError(false);
    setShelters(null);
    api
      .getNearestShelters(o.lat, o.lng)
      .then(setShelters)
      .catch(() => setSheltersError(true));
  }, []);

  useEffect(() => {
    if (origin) loadShelters(origin);
  }, [origin, loadShelters]);

  function pickZone(id: string) {
    setZoneId(id);
    setLocationNote(false);
    const z = zones.find((x) => x.id === id);
    if (z) setOrigin({ lat: z.centerLat, lng: z.centerLng });
  }

  function useMyLocation() {
    const zone = zones.find((x) => x.id === zoneId);
    const fallback = () => {
      setLocating(false);
      setLocationNote(true);
      if (zone) setOrigin({ lat: zone.centerLat, lng: zone.centerLng });
    };
    if (!("geolocation" in navigator)) return fallback();
    setLocating(true);
    setLocationNote(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      fallback,
      { timeout: 6000 },
    );
  }

  const top = shelters?.slice(0, 3) ?? [];

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      {mapError ? (
        <div className="flex h-80 flex-col items-center justify-center gap-3 rounded-xl border text-center lg:h-[28rem]">
          <p className="text-muted-foreground">{t.map.error}</p>
          <Button variant="outline" onClick={loadMap}>
            {t.map.retry}
          </Button>
        </div>
      ) : !map ? (
        <Skeleton className="h-80 w-full rounded-xl lg:h-[28rem]" />
      ) : map.nodes.length === 0 ? (
        <div className="flex h-80 items-center justify-center rounded-xl border text-muted-foreground lg:h-[28rem]">
          {t.map.empty}
        </div>
      ) : (
        <CityMap data={map} highlightShelterId={top[0]?.id} />
      )}

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">{t.citizen.district}</span>
          {zones.length === 0 ? (
            <Skeleton className="h-9 w-full" />
          ) : (
            <Select value={zoneId} onValueChange={pickZone}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t.citizen.districtPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {zones.map((z) => (
                  <SelectItem key={z.id} value={z.id}>
                    {z.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" onClick={useMyLocation} disabled={locating}>
            {locating ? t.citizen.locating : t.citizen.myLocation}
          </Button>
          {locationNote && <p className="text-sm text-muted-foreground">{t.citizen.locationFailed}</p>}
        </div>

        <h2 className="text-lg font-semibold">{t.citizen.nearest}</h2>
        {!origin ? (
          <p className="rounded-xl border p-4 text-sm text-muted-foreground">{t.citizen.pickDistrict}</p>
        ) : sheltersError ? (
          <div className="flex flex-col items-start gap-2 rounded-xl border p-4">
            <p className="text-sm text-muted-foreground">{t.citizen.sheltersError}</p>
            <Button variant="outline" size="sm" onClick={() => loadShelters(origin)}>
              {t.map.retry}
            </Button>
          </div>
        ) : !shelters ? (
          [0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
        ) : top.length === 0 ? (
          <p className="rounded-xl border p-4 text-sm text-muted-foreground">{t.citizen.noShelters}</p>
        ) : (
          top.map((s, i) => (
            <div key={s.id} className={cn("rounded-xl border p-4", i === 0 && "border-primary")}>
              <div className="flex items-start justify-between gap-2">
                <div className="font-medium">{s.name}</div>
                <Badge variant="secondary">{t.citizen.types[s.type]}</Badge>
              </div>
              <div className="mt-1 text-sm text-muted-foreground">{formatDistance(s.distanceM)}</div>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full", pctColor(s.occupancyPct))}
                    style={{ width: `${Math.min(s.occupancyPct, 100)}%` }}
                  />
                </div>
                <span className="text-sm font-medium tabular-nums">
                  {t.citizen.occupancy} {s.occupancyPct}%
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
