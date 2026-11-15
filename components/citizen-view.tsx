"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CitizenActions } from "@/components/citizen-actions";
import { CityMap } from "@/components/city-map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useT } from "@/lib/i18n/provider";
import type { MapData, NearestShelter, RouteReason, RouteResult, Zone } from "@/lib/types";
import { useCitizen } from "@/lib/use-citizen";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
  const t = useT();
  const [map, setMap] = useState<MapData | null>(null);
  const [mapError, setMapError] = useState(false);
  const [zones, setZones] = useState<Zone[]>([]);
  const [zoneId, setZoneId] = useState<string>("");
  const [origin, setOrigin] = useState<Origin | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationNote, setLocationNote] = useState(false);
  const [shelters, setShelters] = useState<NearestShelter[] | null>(null);
  const [sheltersError, setSheltersError] = useState(false);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<"none" | "error" | null>(null);

  const { citizenId, role, setRole, withCitizen } = useCitizen(origin);
  const routeCitizenId = role === "priority" ? (citizenId ?? undefined) : undefined;

  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ reason: RouteReason; from: string; to: string } | null>(null);
  const prevShelter = useRef<{ id: string; name: string } | null>(null);
  const lastMode = useRef<"live" | "fallback" | null>(null);

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

  useEffect(() => {
    if (!origin) return;
    let cancelled = false;
    prevShelter.current = null;
    lastMode.current = null;
    setBanner(null);
    setRouteLoading(true);
    setRouteError(null);
    setRoute(null);
    const poll = (first: boolean) =>
      api
        .getRoute(origin.lat, origin.lng, {
          prev: prevShelter.current?.id,
          citizenId: routeCitizenId,
          shelterId: targetId ?? undefined,
        })
        .then((r) => {
          if (cancelled) return;
          if (r.rerouted && r.reason && prevShelter.current) {
            setBanner({ reason: r.reason, from: prevShelter.current.name, to: r.shelter.name });
          }
          if (targetId && r.shelter.id !== targetId) {
            // chosen shelter is full / unreachable / not accessible: fall back to the recommendation
            toast.info(t.citizen.targetUnavailable);
            setTargetId(null);
          }
          if (lastMode.current === "fallback" && r.mode === "live") toast.success(t.provider.restored);
          lastMode.current = r.mode;
          prevShelter.current = { id: r.shelter.id, name: r.shelter.name };
          setRoute(r);
          setUpdatedAt(Date.now());
          setRouteError(null);
        })
        .catch((e: Error) => !cancelled && setRouteError(e.message === "No reachable shelter" ? "none" : "error"))
        .finally(() => first && !cancelled && setRouteLoading(false));
    poll(true);
    const timer = setInterval(() => poll(false), 3000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `t` only feeds a toast message
  }, [origin, routeCitizenId, targetId]);

  function pickZone(id: string) {
    setZoneId(id);
    setLocationNote(false);
    setTargetId(null);
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

  function toggleRole(checked: boolean) {
    setRole(checked ? "priority" : "standard").catch(() => toast.error(t.citizen.roleFailed));
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
        <CityMap
          data={map}
          route={route?.path}
          origin={origin}
          highlightShelterId={route?.shelter.id ?? top[0]?.id}
          updatedAt={updatedAt}
          degraded={route?.mode === "fallback"}
          onShelterClick={(id) => setTargetId(id)}
          focus={route?.path}
          fitKey={route && origin ? `${origin.lat},${origin.lng}|${route.shelter.id}` : undefined}
        />
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
          <label className="flex items-start gap-2 rounded-lg border p-3 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 size-4"
              checked={role === "priority"}
              onChange={(e) => toggleRole(e.target.checked)}
            />
            <span className="flex flex-col">
              <span className="font-medium">{t.citizen.roleToggle}</span>
              <span className="text-muted-foreground">{t.citizen.roleHint}</span>
            </span>
          </label>
        </div>

        {origin && (
          <div className="rounded-xl border border-blue-600 p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">{t.citizen.route}</h2>
              <div className="flex flex-wrap justify-end gap-1">
                {targetId && route?.shelter.id === targetId && <Badge variant="outline">{t.citizen.chosenBadge}</Badge>}
                {route?.accessible && <Badge variant="secondary">{t.citizen.accessibleRoute}</Badge>}
              </div>
            </div>
            {banner && (
              <div role="status" className="mt-2 rounded-lg bg-amber-100 p-3 text-sm text-amber-900">
                <div className="font-semibold">{t.citizen.reroute[banner.reason]}</div>
                <div>
                  {t.citizen.reroute.from}: {banner.from} · {t.citizen.reroute.to}: {banner.to}
                </div>
              </div>
            )}
            {route?.mode === "fallback" && (
              <div role="status" className="mt-2 rounded-lg bg-amber-100 p-3 text-sm text-amber-900">
                <div className="font-semibold">{t.provider.offlineTitle}</div>
                <div>{t.provider.offlineHint}</div>
              </div>
            )}
            {routeLoading ? (
              <Skeleton className="mt-2 h-12 w-full" />
            ) : route ? (
              <div className="mt-1 text-sm">
                <div className="font-medium">
                  {t.citizen.routeTarget}: {route.shelter.name}
                </div>
                <div className="text-muted-foreground">
                  {t.citizen.routeDistance}: {route.mode === "fallback" ? "~" : ""}{formatDistance(route.distanceM)} · {t.citizen.routeEta}:{" "}
                  {route.mode === "fallback" ? "~" : ""}{route.etaMin} {t.citizen.routeMin}{route.mode === "fallback" ? ` (${t.provider.approx})` : ""}
                </div>
                {targetId && (
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => setTargetId(null)}>
                    {t.citizen.backToRecommended}
                  </Button>
                )}
                <details className="mt-3" open>
                  <summary className="cursor-pointer font-medium">{t.citizen.directions}</summary>
                  <ol className="mt-2 flex flex-col gap-1.5 border-l-2 border-blue-600 pl-3">
                    <li>{t.citizen.stepStart}: {t.map.youAreHere}</li>
                    {route.steps.map((st, i) => (
                      <li key={`${st.name}-${i}`} className="flex justify-between gap-2">
                        <span>{st.name}</span>
                        <span className="text-muted-foreground tabular-nums">{formatDistance(st.distanceM)}</span>
                      </li>
                    ))}
                    <li className="font-medium">{t.citizen.stepArrive}: {route.shelter.name}</li>
                  </ol>
                </details>
              </div>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">
                {routeError === "error" ? t.citizen.routeError : t.citizen.routeNone}
              </p>
            )}
          </div>
        )}

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
                <div className="flex flex-wrap justify-end gap-1">
                  {!s.isAccessible && <Badge variant="outline">{t.citizen.notAccessible}</Badge>}
                  <Badge variant="secondary">{t.citizen.types[s.type]}</Badge>
                </div>
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
              <Button
                variant={route?.shelter.id === s.id ? "secondary" : "outline"}
                size="sm"
                className="mt-3 w-full"
                disabled={route?.shelter.id === s.id}
                onClick={() => setTargetId(s.id)}
              >
                {route?.shelter.id === s.id ? t.citizen.currentTarget : t.citizen.goHere}
              </Button>
            </div>
          ))
        )}
      </div>
      <CitizenActions origin={origin} withCitizen={withCitizen} />
    </div>
  );
}
