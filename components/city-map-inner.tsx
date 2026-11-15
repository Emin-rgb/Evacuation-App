"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  Add01Icon,
  Cancel01Icon,
  FullScreenIcon,
  MinusSignIcon,
  Refresh01Icon,
  UserIcon,
  WheelchairIcon,
  Wifi01Icon,
  WifiDisconnected01Icon,
} from "@hugeicons/core-free-icons";
import { SHELTER_ICON, SOS_ICON, SOS_SWATCH } from "@/lib/map-icons";
import { useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import type { MapData, ShelterType, SosType } from "@/lib/types";

type LatLng = { lat: number; lng: number };
export type MapSos = LatLng & { id: string; type: SosType; priority?: number };

export type CityMapProps = {
  data: MapData;
  route?: LatLng[];
  sos?: MapSos[];
  /** the citizen's own position: drawn as a pulsing "You are here" marker */
  origin?: LatLng | null;
  highlightShelterId?: string;
  /** SOS marker to emphasise (e.g. selected row on the dispatcher) */
  highlightSosId?: string | null;
  /** timestamp (ms) of the last successful data refresh */
  updatedAt?: number | null;
  /** external routing API is down: the badge shows the backup-mode state */
  degraded?: boolean;
  /** re-fetch everything now (the "Update" button) */
  onRefresh?: () => void;
  refreshing?: boolean;
  /** tap/click/Enter on a shelter marker */
  onShelterClick?: (id: string) => void;
  /** when this key changes the view animates to fit `focus` (e.g. the route) */
  fitKey?: string;
  focus?: LatLng[];
  className?: string;
};

type Layers = { roads: boolean; shelters: boolean; sos: boolean };

const OCC_BG = (pct: number) =>
  pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500";

/** Serialise a hugeicons icon to an inline SVG string (for Leaflet divIcons). */
function iconSvg(icon: IconSvgElement, size: number) {
  const kebab = (k: string) => k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
  const inner = icon
    .map(([tag, attrs]) => {
      const a = Object.entries(attrs as Record<string, unknown>)
        .filter(([k]) => k !== "key")
        .map(([k, v]) => `${kebab(k)}="${String(v)}"`)
        .join(" ");
      return `<${tag} ${a}/>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke-width="2" aria-hidden="true">${inner}</svg>`;
}

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function reducedMotion() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

const dot = (inner: string, cls: string, size: number, extra = "") =>
  `<div class="relative flex items-center justify-center rounded-full border-2 border-white text-white shadow ${cls}" style="width:${size}px;height:${size}px">${inner}${extra}</div>`;

function shelterIcon(
  s: MapData["shelters"][number],
  opts: { highlighted: boolean; flash: boolean; clickable: boolean },
) {
  const ring = opts.highlighted
    ? `<span class="absolute -inset-1.5 rounded-full border-[3px] border-blue-600"></span>`
    : "";
  const flash = opts.flash
    ? `<span class="map-flash absolute -inset-1 rounded-full border-4 border-amber-500"></span>`
    : "";
  const badge = !s.isAccessible
    ? `<span class="absolute -top-1.5 -right-2 flex size-4 items-center justify-center rounded-full border-2 border-white bg-slate-700">${iconSvg(WheelchairIcon, 9)}<span class="absolute h-0.5 w-4 rotate-45 rounded bg-red-400"></span></span>`
    : "";
  const label = `<span class="text-foreground absolute top-full mt-0.5 left-1/2 -translate-x-1/2 rounded bg-white/85 px-1 text-[11px] leading-tight font-medium whitespace-nowrap">${esc(s.name)}</span>`;
  return L.divIcon({
    className: "",
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    html: `<div class="relative ${opts.clickable ? "cursor-pointer" : ""}">${flash}${ring}${dot(iconSvg(SHELTER_ICON[s.type], 15), OCC_BG(s.occupancyPct), 30)}${badge}${label}</div>`,
  });
}

function sosIcon(s: MapSos, highlighted: boolean) {
  const bg = SOS_SWATCH[s.type];
  const pulse = `<span class="map-pulse absolute -inset-1 rounded-full ${s.priority ? "bg-red-500/50" : "bg-black/20"}"></span>`;
  const ring = s.priority
    ? `<span class="absolute -inset-1 rounded-full border-[3px] border-red-600"></span>`
    : "";
  const hl = highlighted
    ? `<span class="absolute -inset-2 rounded-full border-[3px] border-blue-600"></span>`
    : "";
  return L.divIcon({
    className: "",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    html: `<div class="relative">${pulse}${hl}${ring}${dot(iconSvg(SOS_ICON[s.type], 12), bg, 24)}</div>`,
  });
}

const closedIcon = L.divIcon({
  className: "",
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  html: `<div class="map-pop flex size-[22px] items-center justify-center rounded-full border-2 border-white bg-red-600 text-white shadow">${iconSvg(Cancel01Icon, 11)}</div>`,
});

function zoneIcon(name: string) {
  return L.divIcon({
    className: "",
    iconSize: [0, 0],
    html: `<div class="pointer-events-none -translate-x-1/2 -translate-y-1/2 text-sm font-bold tracking-[0.2em] whitespace-nowrap text-slate-700/45 uppercase" style="text-shadow:0 0 4px #fff,0 0 4px #fff">${esc(name)}</div>`,
  });
}

function meIcon(label: string) {
  return L.divIcon({
    className: "",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    html: `<div class="relative"><span class="map-pulse absolute -inset-2 rounded-full bg-blue-500/50"></span>${dot(iconSvg(UserIcon, 12), "bg-blue-600", 24)}<span class="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 rounded bg-white/90 px-1 text-xs font-semibold whitespace-nowrap text-blue-700">${esc(label)}</span></div>`,
  });
}

/** Fits the view to all data once, to `focus` whenever `fitKey` changes, and exposes "reset". */
function ViewController({
  all,
  focus,
  fitKey,
  resetSignal,
}: {
  all: LatLng[];
  focus?: LatLng[];
  fitKey?: string;
  resetSignal: number;
}) {
  const map = useMap();
  const allRef = useRef(all);
  const focusRef = useRef(focus);
  useEffect(() => {
    allRef.current = all;
    focusRef.current = focus;
  });

  const fit = (pts: LatLng[], animate: boolean) => {
    if (pts.length === 0) return;
    const b = L.latLngBounds(pts.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(b, {
      padding: [40, 40],
      maxZoom: 16,
      animate: animate && !reducedMotion(),
    });
  };

  // initial fit
  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current || allRef.current.length === 0) return;
    didInit.current = true;
    fit(allRef.current, false);
  });

  useEffect(() => {
    const pts = focusRef.current;
    if (!fitKey || !pts || pts.length === 0) return;
    if (pts.length === 1) {
      map.flyTo([pts[0].lat, pts[0].lng], Math.max(map.getZoom(), 15), {
        animate: !reducedMotion(),
      });
    } else fit(pts, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only fitKey drives this
  }, [fitKey]);

  useEffect(() => {
    if (resetSignal > 0) fit(allRef.current, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only resetSignal drives this
  }, [resetSignal]);

  return null;
}

function MapButton({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: IconSvgElement;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="hover:bg-accent flex size-9 items-center justify-center border-b last:border-b-0"
    >
      <HugeiconsIcon icon={icon} size={18} aria-hidden="true" />
    </button>
  );
}

function StatusBadge({
  updatedAt,
  degraded,
  onRefresh,
  refreshing,
}: Pick<CityMapProps, "updatedAt" | "degraded" | "onRefresh" | "refreshing">) {
  const t = useT();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const secs = updatedAt ? Math.max(0, Math.round((now - updatedAt) / 1000)) : null;
  const stale = (secs !== null && secs > 9) || !!degraded;
  return (
    <div className="bg-background/95 absolute top-2 left-2 z-[1000] flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs shadow-sm">
      <HugeiconsIcon
        icon={stale ? WifiDisconnected01Icon : Wifi01Icon}
        size={14}
        className={stale ? "text-amber-600" : "text-emerald-600"}
        aria-hidden="true"
      />
      <span className={cn("font-semibold", stale ? "text-amber-700" : "text-emerald-700")}>
        {degraded ? t.map.fallback : stale ? t.map.delayed : t.map.live}
      </span>
      {secs !== null && (
        <span className="text-muted-foreground hidden sm:inline">
          · {t.map.updated} {secs} {t.map.secAgo}
        </span>
      )}
      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          aria-label={t.map.refresh}
          className="hover:bg-accent flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium disabled:opacity-60"
        >
          <HugeiconsIcon
            icon={Refresh01Icon}
            size={13}
            className={cn(refreshing && "animate-spin")}
            aria-hidden="true"
          />
          {t.map.refresh}
        </button>
      )}
      <span className="text-muted-foreground border-l pl-2">{t.map.simulation}</span>
    </div>
  );
}

export default function CityMapInner({
  data,
  route,
  sos,
  origin,
  highlightShelterId,
  highlightSosId,
  updatedAt,
  degraded,
  onRefresh,
  refreshing,
  onShelterClick,
  fitKey,
  focus,
  className,
}: CityMapProps) {
  const t = useT();
  const mapRef = useRef<L.Map | null>(null);
  // Leaflet cannot re-attach to a container it already used. When the route is hidden and shown
  // again (Cache Components keeps it mounted) or React re-runs effects, build a brand-new map.
  const [instance, setInstance] = useState(0);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- new map instance per activation
    setInstance((n) => n + 1);
    return () => setInstance(0);
  }, []);
  const [layers, setLayers] = useState<Layers>({ roads: true, shelters: true, sos: true });
  const [resetSignal, setResetSignal] = useState(0);
  const [tileErrors, setTileErrors] = useState(0);

  // flash a ring when a shelter's occupancy changes or a new shelter appears (adjust-state-on-prop-change)
  const [prevShelters, setPrevShelters] = useState(data.shelters);
  const [flashing, setFlashing] = useState<Set<string>>(new Set());
  if (prevShelters !== data.shelters) {
    const next = new Set<string>();
    for (const s of data.shelters) {
      const old = prevShelters.find((o) => o.id === s.id);
      if ((old && old.occupancyPct !== s.occupancyPct) || (!old && prevShelters.length > 0))
        next.add(s.id);
    }
    setPrevShelters(data.shelters);
    if (next.size > 0) setFlashing(next);
  }
  useEffect(() => {
    if (flashing.size === 0) return;
    const id = setTimeout(() => setFlashing(new Set()), 1500);
    return () => clearTimeout(id);
  }, [flashing]);

  const nodeById = useMemo(() => new Map(data.nodes.map((n) => [n.id, n])), [data.nodes]);
  const all = useMemo<LatLng[]>(
    () => [...data.nodes, ...data.shelters],
    [data.nodes, data.shelters],
  );
  const closedCount = data.edges.filter((e) => e.status === "closed").length;
  const zoneIcons = useMemo(
    () => data.zones.map((z) => ({ z, icon: zoneIcon(z.name) })),
    [data.zones],
  );
  const youIcon = useMemo(() => meIcon(t.map.youAreHere), [t]);

  const toggles: { key: keyof Layers; label: string; show: boolean }[] = [
    { key: "roads", label: t.map.layerRoads, show: true },
    { key: "shelters", label: t.map.layerShelters, show: true },
    { key: "sos", label: t.map.layerSos, show: !!sos },
  ];

  const center: [number, number] = all.length ? [all[0].lat, all[0].lng] : [40.4093, 49.8671];
  const routeLine =
    route && route.length > 1 ? route.map((p) => [p.lat, p.lng] as [number, number]) : null;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground font-medium">{t.map.layers}:</span>
        {toggles
          .filter((x) => x.show)
          .map(({ key, label }) => (
            <button
              key={key}
              type="button"
              aria-pressed={layers[key]}
              onClick={() => setLayers((l) => ({ ...l, [key]: !l[key] }))}
              className={cn(
                "rounded-full border px-2.5 py-1 font-medium transition-colors",
                layers[key]
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground",
              )}
            >
              {label}
            </button>
          ))}
      </div>

      <div
        className="relative isolate h-80 overflow-hidden rounded-xl border lg:h-[28rem]"
        role="region"
        aria-label={t.map.ariaLabel}
      >
        {instance > 0 && (
          <MapContainer
            key={instance}
            ref={mapRef}
            center={center}
            zoom={12}
            zoomControl={false}
            scrollWheelZoom
            className="size-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
              eventHandlers={{
                tileerror: () => setTileErrors((n) => n + 1),
                tileload: () => setTileErrors(0),
              }}
            />
            <ViewController all={all} focus={focus} fitKey={fitKey} resetSignal={resetSignal} />

            {zoneIcons.map(({ z, icon }) => (
              <Marker
                key={z.id}
                position={[z.lat, z.lng]}
                icon={icon}
                interactive={false}
                keyboard={false}
              />
            ))}

            {layers.roads &&
              data.edges.map((e) => {
                const a = nodeById.get(e.fromNodeId);
                const b = nodeById.get(e.toNodeId);
                if (!a || !b) return null;
                const closed = e.status === "closed";
                return (
                  <Polyline
                    key={`${e.id}-${closed}`}
                    positions={[
                      [a.lat, a.lng],
                      [b.lat, b.lng],
                    ]}
                    pathOptions={{
                      color: closed ? "#ef4444" : "#64748b",
                      weight: closed ? 5 : 3,
                      opacity: closed ? 0.95 : 0.55,
                      dashArray: closed ? "8 8" : undefined,
                      lineCap: "round",
                    }}
                  />
                );
              })}

            {layers.roads &&
              data.edges
                .filter((e) => e.status === "closed")
                .map((e) => {
                  const a = nodeById.get(e.fromNodeId);
                  const b = nodeById.get(e.toNodeId);
                  if (!a || !b) return null;
                  return (
                    <Marker
                      key={`x-${e.id}`}
                      position={[(a.lat + b.lat) / 2, (a.lng + b.lng) / 2]}
                      icon={closedIcon}
                      title={`${e.name} (${t.map.closedSuffix})`}
                      keyboard={false}
                    />
                  );
                })}

            {routeLine && (
              <>
                <Polyline
                  positions={routeLine}
                  pathOptions={{
                    color: "#2563eb",
                    weight: 7,
                    opacity: 0.9,
                    lineCap: "round",
                    lineJoin: "round",
                  }}
                />
                <Polyline
                  positions={routeLine}
                  pathOptions={{
                    color: "#ffffff",
                    weight: 2,
                    dashArray: "2 12",
                    lineCap: "round",
                    className: "map-flow",
                  }}
                />
              </>
            )}

            {layers.shelters &&
              data.shelters.map((s) => (
                <Marker
                  key={s.id}
                  position={[s.lat, s.lng]}
                  icon={shelterIcon(s, {
                    highlighted: s.id === highlightShelterId,
                    flash: flashing.has(s.id),
                    clickable: !!onShelterClick,
                  })}
                  title={`${s.name}: ${s.occupancyPct}%`}
                  zIndexOffset={s.id === highlightShelterId ? 500 : 0}
                  eventHandlers={{ click: () => onShelterClick?.(s.id) }}
                />
              ))}

            {layers.sos &&
              sos?.map((s) => (
                <Marker
                  key={s.id}
                  position={[s.lat, s.lng]}
                  icon={sosIcon(s, s.id === highlightSosId)}
                  zIndexOffset={s.priority ? 800 : 600}
                />
              ))}

            {origin && (
              <Marker
                position={[origin.lat, origin.lng]}
                icon={youIcon}
                zIndexOffset={1000}
                interactive={false}
              />
            )}
          </MapContainer>
        )}

        <StatusBadge
          updatedAt={updatedAt === undefined ? undefined : updatedAt}
          degraded={degraded}
          onRefresh={onRefresh}
          refreshing={refreshing}
        />

        <div className="bg-background absolute top-2 right-2 z-[1000] flex flex-col overflow-hidden rounded-lg border shadow-sm">
          <MapButton
            label={t.map.zoomIn}
            icon={Add01Icon}
            onClick={() => mapRef.current?.zoomIn()}
          />
          <MapButton
            label={t.map.zoomOut}
            icon={MinusSignIcon}
            onClick={() => mapRef.current?.zoomOut()}
          />
          <MapButton
            label={t.map.resetView}
            icon={FullScreenIcon}
            onClick={() => setResetSignal((n) => n + 1)}
          />
        </div>

        {tileErrors >= 3 && (
          <div className="absolute bottom-2 left-2 z-[1000] rounded-lg border border-amber-300 bg-amber-100 px-2.5 py-1 text-xs text-amber-900">
            {t.map.tilesError}
          </div>
        )}
      </div>

      <div
        role="group"
        aria-label={t.map.legend}
        className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs"
      >
        {origin && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-3 rounded-full bg-blue-600" aria-hidden="true" />
            {t.map.youAreHere}
          </span>
        )}
        {route && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-1 w-5 rounded bg-blue-600" aria-hidden="true" />
            {t.map.legendRoute}
          </span>
        )}
        {closedCount > 0 && (
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-0 w-5 border-t-4 border-dashed border-red-500"
              aria-hidden="true"
            />
            {t.map.legendClosed}
          </span>
        )}
        <span className="flex items-center gap-1.5">
          {t.map.legendOccupancy}:
          <span
            className="inline-block size-3 rounded-full bg-emerald-500"
            aria-hidden="true"
          />{" "}
          {t.map.occLow}
          <span className="inline-block size-3 rounded-full bg-amber-500" aria-hidden="true" />{" "}
          {t.map.occMid}
          <span className="inline-block size-3 rounded-full bg-red-500" aria-hidden="true" />{" "}
          {t.map.occHigh}
        </span>
        <span className="flex items-center gap-2">
          {(Object.keys(SHELTER_ICON) as ShelterType[]).map((k) => (
            <span key={k} className="flex items-center gap-1">
              <HugeiconsIcon icon={SHELTER_ICON[k]} size={14} aria-hidden="true" />
              {t.citizen.types[k]}
            </span>
          ))}
        </span>
        {sos && (
          <span className="flex items-center gap-2">
            {(Object.keys(SOS_ICON) as SosType[]).map((k) => (
              <span key={k} className="flex items-center gap-1">
                <span
                  className={cn(
                    "flex size-4 items-center justify-center rounded-full text-white",
                    SOS_SWATCH[k],
                  )}
                >
                  <HugeiconsIcon icon={SOS_ICON[k]} size={10} aria-hidden="true" />
                </span>
                {t.dispatcher.sosTypes[k]}
              </span>
            ))}
          </span>
        )}
      </div>
    </div>
  );
}
