"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { api } from "@/lib/api";
import { t } from "@/lib/i18n";
import type { MapData, MapShelter } from "@/lib/types";

function ShelterRow({ shelter, onChanged }: { shelter: MapShelter; onChanged: () => void }) {
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);

  async function apply(pct: number) {
    const clamped = Math.max(0, Math.min(100, pct));
    setBusy(true);
    try {
      const res = await api.setShelterOccupancy(shelter.id, Math.round((shelter.capacity * clamped) / 100));
      toast.success(`${t.simulator.occupancyToast}: ${res.name} → ${res.occupancyPct}%`);
      onChanged();
    } catch {
      toast.error(t.simulator.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="flex flex-col gap-2 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{shelter.name}</span>
        <Badge variant="secondary">{shelter.occupancyPct}%</Badge>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" disabled={busy} onClick={() => apply(shelter.occupancyPct + 10)}>
          +10%
        </Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => apply(92)}>
          92%
        </Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => apply(96)}>
          96%
        </Button>
        <Input
          type="number"
          min={0}
          max={100}
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          aria-label={t.dispatcher.colOccupancy}
          className="h-8 w-20"
        />
        <Button size="sm" disabled={busy || custom === ""} onClick={() => apply(Number(custom))}>
          {t.simulator.set}
        </Button>
      </div>
    </li>
  );
}

export function SimulatorPanel({ map, onChanged }: { map: MapData; onChanged: () => void }) {
  const [busyRoad, setBusyRoad] = useState<string | null>(null);

  async function toggleRoad(id: string, closeIt: boolean) {
    setBusyRoad(id);
    try {
      const res = await api.setRoadStatus(id, closeIt ? "closed" : "open");
      toast.success(`${closeIt ? t.simulator.roadClosedToast : t.simulator.roadOpenedToast}: ${res.name}`);
      onChanged();
    } catch {
      toast.error(t.simulator.error);
    } finally {
      setBusyRoad(null);
    }
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">{t.simulator.open}</Button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t.simulator.title}</SheetTitle>
          <SheetDescription>{t.simulator.description}</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-6 px-4 pb-6">
          <section className="flex flex-col gap-2">
            <h3 className="font-semibold">{t.simulator.shelters}</h3>
            <ul className="flex flex-col gap-2">
              {map.shelters.map((s) => (
                <ShelterRow key={s.id} shelter={s} onChanged={onChanged} />
              ))}
            </ul>
          </section>
          <section className="flex flex-col gap-2">
            <h3 className="font-semibold">{t.simulator.roads}</h3>
            <ul className="flex flex-col gap-2">
              {map.edges.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-2 rounded-lg border p-2">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{e.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {e.status === "closed" ? t.simulator.closed : t.simulator.openStatus}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant={e.status === "closed" ? "outline" : "destructive"}
                    disabled={busyRoad === e.id}
                    onClick={() => toggleRoad(e.id, e.status !== "closed")}
                  >
                    {e.status === "closed" ? t.simulator.reopen : t.simulator.close}
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
