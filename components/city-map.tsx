"use client";

import { useMemo } from "react";
import { useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import type { MapData, SosType } from "@/lib/types";

type LatLng = { lat: number; lng: number };
export type MapSos = LatLng & { id: string; type: SosType; priority?: number };

type Props = {
  data: MapData;
  route?: LatLng[];
  sos?: MapSos[];
  highlightShelterId?: string;
  className?: string;
};

const W = 800;
const H = 560;
const PAD = 40;

const SOS_FILL: Record<SosType, string> = {
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

export function CityMap({ data, route, sos, highlightShelterId, className }: Props) {
  const t = useT();
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

  const nodeById = useMemo(() => new Map(data.nodes.map((n) => [n.id, n])), [data.nodes]);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={t.map.ariaLabel}
      className={cn("w-full rounded-xl border bg-muted/40", className)}
    >
      {data.edges.map((e) => {
        const a = nodeById.get(e.fromNodeId);
        const b = nodeById.get(e.toNodeId);
        if (!a || !b) return null;
        const p = project(a);
        const q = project(b);
        const closed = e.status === "closed";
        return (
          <line
            key={e.id}
            x1={p.x}
            y1={p.y}
            x2={q.x}
            y2={q.y}
            strokeLinecap="round"
            strokeDasharray={closed ? "6 5" : undefined}
            className={cn(closed ? "stroke-red-500" : "stroke-muted-foreground/40")}
            strokeWidth={closed ? 4 : 3}
          >
            <title>{closed ? `${e.name} (${t.map.closedSuffix})` : e.name}</title>
          </line>
        );
      })}

      {data.nodes.map((n) => {
        const p = project(n);
        return <circle key={n.id} cx={p.x} cy={p.y} r={3} className="fill-muted-foreground/60" />;
      })}

      {route && route.length > 1 && (
        <polyline
          points={route
            .map((pt) => {
              const p = project(pt);
              return `${p.x},${p.y}`;
            })
            .join(" ")}
          fill="none"
          strokeWidth={6}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="stroke-blue-600"
        />
      )}

      {data.shelters.map((s) => {
        const p = project(s);
        const highlighted = s.id === highlightShelterId;
        return (
          <g key={s.id}>
            {highlighted && (
              <circle cx={p.x} cy={p.y} r={20} className="fill-none stroke-blue-600" strokeWidth={3} />
            )}
            <circle
              cx={p.x}
              cy={p.y}
              r={12}
              className={cn(occupancyFill(s.occupancyPct), "stroke-background")}
              strokeWidth={3}
            >
              <title>{`${s.name}: ${s.occupancyPct}%`}</title>
            </circle>
            <text
              x={p.x}
              y={p.y - 18}
              textAnchor="middle"
              className="fill-foreground text-[11px] font-medium"
            >
              {s.name}
            </text>
          </g>
        );
      })}

      {sos?.map((s) => {
        const p = project(s);
        return (
          <g key={s.id}>
            {s.priority ? (
              <circle cx={p.x} cy={p.y} r={11} fill="none" className="stroke-red-600" strokeWidth={3} />
            ) : null}
            <circle cx={p.x} cy={p.y} r={6} className={cn(SOS_FILL[s.type], "stroke-background")} strokeWidth={2} />
          </g>
        );
      })}
    </svg>
  );
}
