"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import type { CityMapProps } from "@/components/city-map-inner";

export type { MapSos } from "@/components/city-map-inner";

// Leaflet needs `window`, so the map is client-only
const Inner = dynamic(() => import("@/components/city-map-inner"), {
  ssr: false,
  loading: () => <Skeleton className="h-80 w-full rounded-xl lg:h-[28rem]" />,
});

export function CityMap(props: CityMapProps) {
  return <Inner {...props} />;
}
