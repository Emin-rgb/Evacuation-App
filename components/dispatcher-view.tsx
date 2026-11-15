"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CityMap } from "@/components/city-map";
import { SimulatorPanel } from "@/components/simulator-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { t } from "@/lib/i18n";
import type { DashboardData, MapData, TeamStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const POLL_MS = 3000;

function pctColor(pct: number) {
  if (pct >= 90) return "bg-red-500";
  if (pct >= 70) return "bg-amber-500";
  return "bg-emerald-500";
}

function minutesAgo(iso: string) {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
}

const TEAM_BADGE: Record<TeamStatus, string> = {
  available: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  en_route: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  on_scene: "bg-red-500/15 text-red-700 dark:text-red-400",
};

function Empty({ children }: { children: string }) {
  return <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">{children}</p>;
}

export function DispatcherView() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [map, setMap] = useState<MapData | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    Promise.all([api.getDashboard(), api.getMap()])
      .then(([d, m]) => {
        setData(d);
        setMap(m);
        setError(false);
      })
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  const sosPoints = useMemo(
    () => data?.sos.filter((s) => s.status !== "resolved").map(({ id, lat, lng, type }) => ({ id, lat, lng, type })),
    [data],
  );

  if (!data || !map) {
    if (error) {
      return (
        <div className="flex flex-col items-center gap-3 rounded-xl border p-10 text-center">
          <p className="text-muted-foreground">{t.dispatcher.error}</p>
          <Button variant="outline" onClick={load}>
            {t.dispatcher.retry}
          </Button>
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{t.dispatcher.alerts}</h2>
          <Skeleton className="h-20 w-full rounded-xl" />
        </section>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-96 rounded-xl" />
          <div className="flex flex-col gap-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const kpis = [
    { label: t.dispatcher.kpiSos, value: data.stats.activeSos, tone: "text-red-600" },
    { label: t.dispatcher.kpiSafe, value: data.stats.safeCitizens, tone: "text-emerald-600" },
    { label: t.dispatcher.kpiCritical, value: data.stats.criticalShelters, tone: "text-amber-600" },
    { label: t.dispatcher.kpiTeams, value: data.stats.availableTeams, tone: "" },
  ];

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">
          {t.dispatcher.error}
        </p>
      )}
      <div className="flex justify-end">
        <SimulatorPanel map={map} onChanged={load} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="flex flex-col gap-1">
              <span className={cn("text-3xl font-semibold", k.tone)}>{k.value}</span>
              <span className="text-sm text-muted-foreground">{k.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{t.dispatcher.alerts}</h2>
        {data.alerts.length === 0 ? (
          <Empty>{t.dispatcher.noAlerts}</Empty>
        ) : (
          data.alerts.map((a) => (
            <div key={a.id} className="rounded-xl border border-red-500/40 bg-red-500/10 p-4">
              <p className="font-medium">
                {a.zoneName} · {a.message}
              </p>
              <p className="text-sm text-muted-foreground">
                SOS: {a.sosCount} · {minutesAgo(a.createdAt)} {t.dispatcher.min} {t.dispatcher.ago}
              </p>
            </div>
          ))
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{t.dispatcher.mapTitle}</h2>
          <CityMap data={map} sos={sosPoints} />
          {data.closedEdges.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {t.dispatcher.closedRoads}: {data.closedEdges.map((e) => e.name).join(", ")}
            </p>
          )}
        </div>

        <Tabs defaultValue="sos">
          <TabsList>
            <TabsTrigger value="sos">{t.dispatcher.tabSos}</TabsTrigger>
            <TabsTrigger value="shelters">{t.dispatcher.tabShelters}</TabsTrigger>
            <TabsTrigger value="teams">{t.dispatcher.tabTeams}</TabsTrigger>
          </TabsList>

          <TabsContent value="sos">
            {data.sos.length === 0 ? (
              <Empty>{t.dispatcher.noSos}</Empty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.dispatcher.colType}</TableHead>
                    <TableHead>{t.dispatcher.colZone}</TableHead>
                    <TableHead>{t.dispatcher.colStatus}</TableHead>
                    <TableHead className="text-right">{t.dispatcher.colTime}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.sos.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{t.dispatcher.sosTypes[s.type]}</TableCell>
                      <TableCell>{s.zoneName}</TableCell>
                      <TableCell>
                        <Badge variant={s.status === "new" ? "destructive" : "secondary"}>
                          {t.dispatcher.sosStatus[s.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {minutesAgo(s.createdAt)} {t.dispatcher.min}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="shelters">
            {data.shelters.length === 0 ? (
              <Empty>{t.dispatcher.noShelters}</Empty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.dispatcher.colName}</TableHead>
                    <TableHead>{t.dispatcher.colZone}</TableHead>
                    <TableHead className="w-40">{t.dispatcher.colOccupancy}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.shelters.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>{s.zoneName}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className={cn("h-full", pctColor(s.occupancyPct))}
                              style={{ width: `${Math.min(100, s.occupancyPct)}%` }}
                            />
                          </div>
                          <span className="w-10 text-right text-sm tabular-nums">{s.occupancyPct}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="teams">
            {data.teams.length === 0 ? (
              <Empty>{t.dispatcher.noTeams}</Empty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.dispatcher.colName}</TableHead>
                    <TableHead>{t.dispatcher.colZone}</TableHead>
                    <TableHead>{t.dispatcher.colStatus}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.teams.map((tm) => (
                    <TableRow key={tm.id}>
                      <TableCell className="font-medium">{tm.name}</TableCell>
                      <TableCell>{tm.zoneName}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={TEAM_BADGE[tm.status]}>
                          {t.dispatcher.teamStatus[tm.status]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
