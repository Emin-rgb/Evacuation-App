"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { api } from "@/lib/api";
import { useT } from "@/lib/i18n/provider";
import type { RiskSimulation, FailureMode, MapData, MapShelter } from "@/lib/types";

function ShelterRow({ shelter, onChanged }: { shelter: MapShelter; onChanged: () => void }) {
  const t = useT();
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
  const t = useT();
  const [busyRoad, setBusyRoad] = useState<string | null>(null);
  const [bursting, setBursting] = useState(false);
  const [busyApi, setBusyApi] = useState(false);

  async function burst() {
    const n = map.nodes.length;
    if (n === 0) return;
    const lat = map.nodes.reduce((sum, p) => sum + p.lat, 0) / n;
    const lng = map.nodes.reduce((sum, p) => sum + p.lng, 0) / n;
    setBursting(true);
    try {
      const res = await api.sosBurst(lat, lng, 3);
      toast.success(`${t.simulator.burstToast}: ${res.created}`);
      onChanged();
    } catch {
      toast.error(t.simulator.error);
    } finally {
      setBursting(false);
    }
  }

  async function setApi(mode: FailureMode) {
    setBusyApi(true);
    try {
      await api.setProviderMode(mode);
      toast.success(mode === "503" ? t.provider.toast503 : mode === "slow" ? t.provider.toastSlow : t.provider.toastRestore);
      onChanged();
    } catch {
      toast.error(t.simulator.error);
    } finally {
      setBusyApi(false);
    }
  }

  async function setRisk(mode: RiskSimulation) {
    setBusyApi(true);
    try {
      await api.setRiskSimulation(mode);
      toast.success(mode === "quake" ? t.risk.toastQuake : mode === "flood" ? t.risk.toastFlood : t.risk.toastOff);
      onChanged();
    } catch {
      toast.error(t.simulator.error);
    } finally {
      setBusyApi(false);
    }
  }

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
            <h3 className="font-semibold">{t.simulator.burstTitle}</h3>
            <Button variant="destructive" disabled={bursting} onClick={burst}>
              {t.simulator.burst}
            </Button>
          </section>
          <section className="flex flex-col gap-2">
            <h3 className="font-semibold">{t.provider.simTitle}</h3>
            <div className="flex flex-wrap gap-2">
              <Button variant="destructive" disabled={busyApi} onClick={() => setApi("503")}>
                {t.provider.sim503}
              </Button>
              <Button variant="outline" disabled={busyApi} onClick={() => setApi("slow")}>
                {t.provider.simSlow}
              </Button>
              <Button variant="outline" disabled={busyApi} onClick={() => setApi("off")}>
                {t.provider.simRestore}
              </Button>
            </div>
          </section>
          <section className="flex flex-col gap-2">
            <h3 className="font-semibold">{t.risk.simTitle}</h3>
            <div className="flex flex-wrap gap-2">
              <Button variant="destructive" disabled={busyApi} onClick={() => setRisk("quake")}>
                {t.risk.simQuake}
              </Button>
              <Button variant="destructive" disabled={busyApi} onClick={() => setRisk("flood")}>
                {t.risk.simFlood}
              </Button>
              <Button variant="outline" disabled={busyApi} onClick={() => setRisk("none")}>
                {t.risk.simOff}
              </Button>
            </div>
          </section>
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
