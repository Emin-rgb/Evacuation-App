"use client";

import { useCallback, useEffect, useState } from "react";
import { CityMap } from "@/components/city-map";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { t } from "@/lib/i18n";
import type { MapData } from "@/lib/types";

export function CitizenMap() {
  const [data, setData] = useState<MapData | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setError(false);
    api
      .getMap()
      .then(setData)
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <div className="flex h-80 flex-col items-center justify-center gap-3 rounded-xl border text-center lg:h-[28rem]">
        <p className="text-muted-foreground">{t.map.error}</p>
        <Button variant="outline" onClick={load}>
          {t.map.retry}
        </Button>
      </div>
    );
  }
  if (!data) return <Skeleton className="h-80 w-full rounded-xl lg:h-[28rem]" />;
  if (data.nodes.length === 0) {
    return (
      <div className="flex h-80 items-center justify-center rounded-xl border text-muted-foreground lg:h-[28rem]">
        {t.map.empty}
      </div>
    );
  }
  return <CityMap data={data} />;
}
