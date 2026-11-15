"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  Add01Icon,
  Cancel01Icon,
  FullScreenIcon,
  MinusSignIcon,
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

type Props = {
  data: MapData;
  route?: LatLng[];
  sos?: MapSos[];
  /** the citizen's own position: drawn as a pulsing "You are here" marker */
  origin?: LatLng | null;
  highlightShelterId?: string;
  /** SOS marker to emphasise (e.g. selected row on the dispatcher) */
  highlightSosId?: string | null;
  /** timestamp (ms) of the last successful data refresh, drives the Live badge */
  updatedAt?: number | null;
  /** tap/click/Enter on a shelter marker */
  onShelterClick?: (id: string) => void;
  /** when this key changes the view animates to fit `focus` (e.g. the route) */
  fitKey?: string;
  focus?: LatLng[];
  className?: string;
};

const W = 800;
const H = 560;
const PAD = 40;

const SOS_BG: Record<SosType, string> = {
  fire: "fill-orange-500",
  collapse: "fill-purple-500",
  flood: "fill-sky-500",
  medical: "fill-pink-500",
};
function occupancyFill(pct: number) {
  if (pct >= 90) return "fill-red-500";
  if (pct >= 70) return "fill-amber-500";
  return "fill-emerald-500";
}

/** White icon centred on (x, y) inside the SVG. */
function MarkerIcon({
  icon,
  x,
  y,
  size,
}: {
  icon: IconSvgElement;
  x: number;
  y: number;
  size: number;
}) {
  return (
    <g
      transform={`translate(${x - size / 2} ${y - size / 2})`}
      className="text-white"
      pointerEvents="none"
    >
      <HugeiconsIcon icon={icon} size={size} strokeWidth={2} aria-hidden="true" />
    </g>
  );
}

function ZoomButton({
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

const HALO = { paintOrder: "stroke" } as const;

type View = { x: number; y: number; w: number };
const FULL_VIEW: View = { x: 0, y: 0, w: W };
const MIN_W = W / 6;
const viewH = (w: number) => (w * H) / W;

function clampView(v: View): View {
  const w = Math.min(W, Math.max(MIN_W, v.w));
  return { w, x: Math.min(W - w, Math.max(0, v.x)), y: Math.min(H - viewH(w), Math.max(0, v.y)) };
}

function prefersReducedMotion() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

type Layers = { roads: boolean; shelters: boolean; sos: boolean };

function LiveBadge({ updatedAt }: { updatedAt: number | null | undefined }) {
  const t = useT();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const secs = updatedAt ? Math.max(0, Math.round((now - updatedAt) / 1000)) : null;
  const stale = secs !== null && secs > 9;
  return (
    <div className="bg-background/90 pointer-events-none absolute top-2 left-2 flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs shadow-sm">
      <HugeiconsIcon
        icon={stale ? WifiDisconnected01Icon : Wifi01Icon}
        size={14}
        className={stale ? "text-amber-600" : "text-emerald-600"}
        aria-hidden="true"
      />
      <span className={cn("font-semibold", stale ? "text-amber-700" : "text-emerald-700")}>
        {stale ? t.map.delayed : t.map.live}
      </span>
      {secs !== null && (
        <span className="text-muted-foreground">
          · {t.map.updated} {secs} {t.map.secAgo}
        </span>
      )}
      <span className="text-muted-foreground border-l pl-2">{t.map.simulation}</span>
    </div>
  );
}

// Schematic Caspian shoreline (approximate, for orientation only)
const COAST: [number, number][] = [
  [40.335, 49.78],
  [40.35, 49.8],
  [40.355, 49.815],
  [40.358, 49.828],
  [40.36, 49.836],
  [40.363, 49.845],
  [40.366, 49.853],
  [40.37, 49.866],
  [40.376, 49.88],
  [40.382, 49.895],
  [40.386, 49.915],
  [40.386, 49.95],
  [40.3, 49.95],
  [40.3, 49.78],
];

export function CityMap({
  data,
  route,
  sos,
  origin,
  highlightShelterId,
  highlightSosId,
  updatedAt,
  onShelterClick,
  fitKey,
  focus,
  className,
}: Props) {
  const t = useT();
  const [layers, setLayers] = useState<Layers>({ roads: true, shelters: true, sos: true });
  const [view, setView] = useState<View>(FULL_VIEW);
  // flash a ring when a shelter's occupancy changes or a new shelter appears (adjust-state-on-prop-change pattern)
  const [prevShelters, setPrevShelters] = useState(data.shelters);
  const [flashes, setFlashes] = useState<Record<string, number>>({});
  if (prevShelters !== data.shelters) {
    const next = { ...flashes };
    for (const s of data.shelters) {
      const old = prevShelters.find((o) => o.id === s.id);
      if ((old && old.occupancyPct !== s.occupancyPct) || (!old && prevShelters.length > 0))
        next[s.id] = (next[s.id] ?? 0) + 1;
    }
    setPrevShelters(data.shelters);
    setFlashes(next);
  }
  const viewRef = useRef<View>(FULL_VIEW);
  const svgRef = useRef<SVGSVGElement>(null);
  const raf = useRef<number | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const drag = useRef<{ x: number; y: number; view: View; moved: boolean } | null>(null);
  const pinch = useRef<{ dist: number; w: number } | null>(null);
  const justDragged = useRef(false);

  const commit = useCallback((v: View) => {
    viewRef.current = v;
    setView(v);
  }, []);

  const cancelAnim = useCallback(() => {
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    raf.current = null;
  }, []);

  const animateTo = useCallback(
    (target: View) => {
      cancelAnim();
      const to = clampView(target);
      if (prefersReducedMotion()) return commit(to);
      const from = viewRef.current;
      const start = performance.now();
      const DURATION = 400;
      const step = (now: number) => {
        const k = Math.min(1, (now - start) / DURATION);
        const e = 1 - Math.pow(1 - k, 3);
        commit({
          x: from.x + (to.x - from.x) * e,
          y: from.y + (to.y - from.y) * e,
          w: from.w + (to.w - from.w) * e,
        });
        raf.current = k < 1 ? requestAnimationFrame(step) : null;
      };
      raf.current = requestAnimationFrame(step);
    },
    [cancelAnim, commit],
  );

  /** zoom keeping the point under (clientX, clientY) fixed */
  const zoomAt = useCallback(
    (clientX: number, clientY: number, newW: number, animate = false) => {
      const el = svgRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const v = viewRef.current;
      const w = Math.min(W, Math.max(MIN_W, newW));
      const fx = (clientX - rect.left) / rect.width;
      const fy = (clientY - rect.top) / rect.height;
      const next = clampView({
        w,
        x: v.x + fx * v.w - fx * w,
        y: v.y + fy * viewH(v.w) - fy * viewH(w),
      });
      if (animate) animateTo(next);
      else {
        cancelAnim();
        commit(next);
      }
    },
    [animateTo, cancelAnim, commit],
  );

  const zoomCenter = (factor: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (rect)
      zoomAt(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
        viewRef.current.w * factor,
        true,
      );
  };

  // wheel zoom needs a non-passive listener to stop the page from scrolling
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomAt(e.clientX, e.clientY, viewRef.current.w * (e.deltaY > 0 ? 1.15 : 1 / 1.15));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  useEffect(() => cancelAnim, [cancelAnim]);

  function onPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    cancelAnim();
    if (pointers.current.size === 1) {
      drag.current = { x: e.clientX, y: e.clientY, view: viewRef.current, moved: false };
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, w: viewRef.current.w };
      drag.current = null;
    }
  }

  function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      justDragged.current = true;
      zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, (pinch.current.w * pinch.current.dist) / dist);
      return;
    }
    const d = drag.current;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!d || !rect) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) > 4) {
      d.moved = true;
      justDragged.current = true;
      svgRef.current?.setPointerCapture(e.pointerId);
    }
    if (d.moved) {
      const ratio = d.view.w / rect.width;
      commit(clampView({ w: d.view.w, x: d.view.x - dx * ratio, y: d.view.y - dy * ratio }));
    }
  }

  function onPointerUp(e: React.PointerEvent<SVGSVGElement>) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 0) drag.current = null;
    // swallow the click that follows a drag/pinch
    setTimeout(() => {
      justDragged.current = false;
    }, 0);
  }

  const project = useMemo(() => {
    const pts: LatLng[] = [...data.nodes, ...data.shelters];
    const lats = pts.map((p) => p.lat);
    const lngs = pts.map((p) => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const spanLat = maxLat - minLat || 1;
    const spanLng = maxLng - minLng || 1;
    // keep aspect ratio (lng degrees are shorter by cos(lat))
    const kx = Math.cos(((minLat + maxLat) / 2) * (Math.PI / 180));
    const scale = Math.min((W - 2 * PAD) / (spanLng * kx), (H - 2 * PAD) / spanLat);
    const offX = (W - spanLng * kx * scale) / 2;
    const offY = (H - spanLat * scale) / 2;
    return (p: LatLng) => ({
      x: offX + (p.lng - minLng) * kx * scale,
      y: H - (offY + (p.lat - minLat) * scale),
    });
  }, [data]);

  // auto-fit to the route (or any focus points) when fitKey changes
  const focusRef = useRef(focus);
  useEffect(() => {
    focusRef.current = focus;
  });
  useEffect(() => {
    const pts = focusRef.current;
    if (!fitKey || !pts || pts.length === 0) return;
    const xy = pts.map(project);
    const minX = Math.min(...xy.map((p) => p.x));
    const maxX = Math.max(...xy.map((p) => p.x));
    const minY = Math.min(...xy.map((p) => p.y));
    const maxY = Math.max(...xy.map((p) => p.y));
    const pad = 90;
    const w = Math.max(maxX - minX + 2 * pad, ((maxY - minY + 2 * pad) * W) / H, W / 2.5);
    animateTo({ w, x: (minX + maxX) / 2 - w / 2, y: (minY + maxY) / 2 - viewH(w) / 2 });
  }, [fitKey, project, animateTo]);

  const nodeById = useMemo(() => new Map(data.nodes.map((n) => [n.id, n])), [data.nodes]);

  const me = useMemo(() => {
    if (!origin) return null;
    const p = project(origin);
    // keep the marker (and its label) inside the frame even if the point is off the schematic
    return { x: Math.min(W - 60, Math.max(60, p.x)), y: Math.min(H - 20, Math.max(40, p.y)) };
  }, [origin, project]);

  function toggle(key: keyof Layers) {
    setLayers((l) => ({ ...l, [key]: !l[key] }));
  }

  const toggles: { key: keyof Layers; label: string; show: boolean }[] = [
    { key: "roads", label: t.map.layerRoads, show: true },
    { key: "shelters", label: t.map.layerShelters, show: true },
    { key: "sos", label: t.map.layerSos, show: !!sos },
  ];
  const closedCount = data.edges.filter((e) => e.status === "closed").length;

  // markers keep their screen size when zoomed: they are drawn at the origin and scaled by k
  const k = view.w / W;
  const at = (p: { x: number; y: number }) => `translate(${p.x} ${p.y}) scale(${k})`;
  const routePoints =
    route && route.length > 1
      ? route
          .map((pt) => {
            const p = project(pt);
            return `${p.x},${p.y}`;
          })
          .join(" ")
      : null;

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
              onClick={() => toggle(key)}
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

      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`${view.x} ${view.y} ${view.w} ${viewH(view.w)}`}
          role="img"
          aria-label={t.map.ariaLabel}
          className="bg-muted/40 w-full touch-none rounded-xl border select-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <polygon
            points={COAST.map(([lat, lng]) => {
              const p = project({ lat, lng });
              return `${p.x},${p.y}`;
            }).join(" ")}
            className="fill-sky-100 stroke-sky-300"
            strokeWidth={2 * k}
          />
          {(() => {
            const sea = project({ lat: 40.352, lng: 49.87 });
            return (
              <text
                x={sea.x}
                y={sea.y}
                textAnchor="middle"
                className="fill-sky-500/70 font-medium tracking-[0.3em] uppercase"
                fontSize={14 * k}
              >
                {t.map.sea}
              </text>
            );
          })()}
          {data.zones.map((z) => {
            const p = project({ lat: z.lat, lng: z.lng });
            return (
              <text
                key={z.id}
                x={p.x}
                y={p.y}
                textAnchor="middle"
                fontSize={22 * k}
                className="fill-muted-foreground/25 font-semibold tracking-[0.2em] uppercase"
                pointerEvents="none"
              >
                {z.name}
              </text>
            );
          })}

          {layers.roads &&
            data.edges.map((e) => {
              const a = nodeById.get(e.fromNodeId);
              const b = nodeById.get(e.toNodeId);
              if (!a || !b) return null;
              const p = project(a);
              const q = project(b);
              const closed = e.status === "closed";
              return (
                <g key={e.id}>
                  <line
                    x1={p.x}
                    y1={p.y}
                    x2={q.x}
                    y2={q.y}
                    strokeLinecap="round"
                    strokeDasharray={closed ? `${6 * k} ${5 * k}` : undefined}
                    className={cn(closed ? "stroke-red-500" : "stroke-muted-foreground/40")}
                    strokeWidth={(closed ? 4 : 3) * k}
                  >
                    <title>{closed ? `${e.name} (${t.map.closedSuffix})` : e.name}</title>
                  </line>
                  {closed && (
                    <g transform={at({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 })}>
                      <circle
                        r={9}
                        className="map-pop stroke-background fill-red-600"
                        strokeWidth={2}
                      />
                      <MarkerIcon icon={Cancel01Icon} x={0} y={0} size={11} />
                    </g>
                  )}
                </g>
              );
            })}

          {layers.roads &&
            data.nodes.map((n) => {
              const p = project(n);
              return (
                <circle
                  key={n.id}
                  cx={p.x}
                  cy={p.y}
                  r={3 * k}
                  className="fill-muted-foreground/60"
                />
              );
            })}

          {routePoints && (
            <>
              <polyline
                points={routePoints}
                fill="none"
                strokeWidth={6 * k}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="stroke-blue-600"
              />
              <polyline
                points={routePoints}
                fill="none"
                strokeWidth={2 * k}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={`${2 * k} ${12 * k}`}
                className="map-flow stroke-white"
              />
            </>
          )}

          {layers.shelters &&
            data.shelters.map((s) => {
              const p = project(s);
              const highlighted = s.id === highlightShelterId;
              const clickable = !!onShelterClick;
              return (
                <g
                  key={s.id}
                  transform={at(p)}
                  role={clickable ? "button" : undefined}
                  tabIndex={clickable ? 0 : undefined}
                  aria-label={clickable ? `${t.map.selectShelter}: ${s.name}` : undefined}
                  className={cn(
                    clickable &&
                      "cursor-pointer outline-none focus-visible:[&>circle:first-child]:stroke-blue-600",
                  )}
                  onClick={() => {
                    if (clickable && !justDragged.current) onShelterClick(s.id);
                  }}
                  onKeyDown={(e) => {
                    if (clickable && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      onShelterClick(s.id);
                    }
                  }}
                >
                  <circle r={22} className="fill-transparent" />
                  {flashes[s.id] ? (
                    <circle
                      key={`${s.id}-${flashes[s.id]}`}
                      r={16}
                      className="map-flash fill-none stroke-amber-500"
                      strokeWidth={4}
                    />
                  ) : null}
                  {highlighted && (
                    <circle r={22} className="fill-none stroke-blue-600" strokeWidth={3} />
                  )}
                  <circle
                    r={14}
                    className={cn(occupancyFill(s.occupancyPct), "stroke-background")}
                    strokeWidth={3}
                  >
                    <title>{`${s.name}: ${s.occupancyPct}%`}</title>
                  </circle>
                  <MarkerIcon icon={SHELTER_ICON[s.type]} x={0} y={0} size={15} />
                  {!s.isAccessible && (
                    <g>
                      <circle
                        cx={12}
                        cy={-12}
                        r={8}
                        className="stroke-background fill-slate-700"
                        strokeWidth={2}
                      />
                      <MarkerIcon icon={WheelchairIcon} x={12} y={-12} size={10} />
                      <line
                        x1={7}
                        y1={-7}
                        x2={17}
                        y2={-17}
                        className="stroke-red-400"
                        strokeWidth={2}
                        strokeLinecap="round"
                      />
                    </g>
                  )}
                  <text
                    y={-22}
                    textAnchor="middle"
                    style={HALO}
                    className="fill-foreground stroke-background text-[11px] font-medium"
                    strokeWidth={4}
                  >
                    {s.name}
                  </text>
                </g>
              );
            })}

          {layers.sos &&
            sos?.map((s) => {
              const p = project(s);
              return (
                <g key={s.id} transform={at(p)}>
                  <circle
                    r={12}
                    className={cn(
                      "map-pulse",
                      s.priority ? "fill-red-500/50" : "fill-foreground/20",
                    )}
                  />
                  {s.id === highlightSosId && (
                    <circle r={22} className="fill-none stroke-blue-600" strokeWidth={3} />
                  )}
                  {s.priority ? (
                    <circle r={16} fill="none" className="stroke-red-600" strokeWidth={3} />
                  ) : null}
                  <circle
                    r={10}
                    className={cn(SOS_BG[s.type], "stroke-background")}
                    strokeWidth={2}
                  />
                  <MarkerIcon icon={SOS_ICON[s.type]} x={0} y={0} size={12} />
                </g>
              );
            })}

          {me && (
            <g transform={at(me)}>
              <circle r={14} className="map-pulse fill-blue-500/50" />
              <circle r={11} className="stroke-background fill-blue-600" strokeWidth={3} />
              <MarkerIcon icon={UserIcon} x={0} y={0} size={12} />
              <text
                y={-20}
                textAnchor="middle"
                style={HALO}
                className="stroke-background fill-blue-700 text-[12px] font-semibold"
                strokeWidth={4}
              >
                {t.map.youAreHere}
              </text>
            </g>
          )}
        </svg>

        {updatedAt !== undefined && <LiveBadge updatedAt={updatedAt} />}

        <div className="bg-background absolute top-2 right-2 flex flex-col overflow-hidden rounded-lg border shadow-sm">
          <ZoomButton label={t.map.zoomIn} icon={Add01Icon} onClick={() => zoomCenter(1 / 1.5)} />
          <ZoomButton label={t.map.zoomOut} icon={MinusSignIcon} onClick={() => zoomCenter(1.5)} />
          <ZoomButton
            label={t.map.resetView}
            icon={FullScreenIcon}
            onClick={() => animateTo(FULL_VIEW)}
          />
        </div>
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
