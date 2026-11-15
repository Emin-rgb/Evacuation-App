"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CityMap } from "@/components/city-map";
import { SimulatorPanel } from "@/components/simulator-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  Alert02Icon,
  AmbulanceIcon,
  CheckmarkCircle02Icon,
  Home01Icon,
  UserGroup03Icon,
} from "@hugeicons/core-free-icons";
import { SOS_ICON, SOS_SWATCH } from "@/lib/map-icons";
import { api } from "@/lib/api";
import { useT } from "@/lib/i18n/provider";
import type { DashboardData, FailureMode, MapData, ProviderHealth, TeamStatus } from "@/lib/types";
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
  return (
    <p className="text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm">
      {children}
    </p>
  );
}

export function DispatcherView() {
  const t = useT();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [map, setMap] = useState<MapData | null>(null);
  const [error, setError] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [selectedSos, setSelectedSos] = useState<string | null>(null);
  const [health, setHealth] = useState<(ProviderHealth & { mode: FailureMode }) | null>(null);

  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    api
      .getProviderHealth()
      .then(setHealth)
      .catch(() => {});
    Promise.all([api.getDashboard(), api.getMap()])
      .then(([d, m]) => {
        setData(d);
        setMap(m);
        setUpdatedAt(Date.now());
        setError(false);
      })
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  async function handleAlert(id: string, action: "approve" | "dismiss") {
    setBusyId(id);
    try {
      if (action === "approve") {
        const r = await api.approveAlert(id);
        toast.success(t.dispatcher.approveToast, {
          description: [
            r.team ? `${t.dispatcher.toastTeam}: ${r.team.name}` : t.dispatcher.toastNoTeam,
            r.shelter
              ? `${t.dispatcher.toastShelter}: ${r.shelter.name}`
              : t.dispatcher.toastNoShelter,
          ].join(" · "),
        });
      } else {
        await api.dismissAlert(id);
        toast.success(t.dispatcher.dismissToast);
      }
      load();
    } catch {
      toast.error(t.dispatcher.actionError);
    } finally {
      setBusyId(null);
    }
  }

  const sosPoints = useMemo(
    () =>
      data?.sos
        .filter((s) => s.status !== "resolved")
        .map(({ id, lat, lng, type, priority }) => ({ id, lat, lng, type, priority })),
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

  const focusSos = data.sos.find((s) => s.id === selectedSos) ?? null;

  const degraded =
    !!health && (health.state !== "closed" || health.source !== "live" || health.mode !== "off");
  const kpis: {
    label: string;
    value: number;
    tone: string;
    sub: string | null;
    icon: IconSvgElement;
    bg: string;
  }[] = [
    {
      label: t.dispatcher.kpiSos,
      value: data.stats.activeSos,
      tone: "text-red-600",
      icon: Alert02Icon,
      bg: "bg-red-500/10 text-red-600",
      sub:
        data.stats.prioritySos > 0
          ? `${t.dispatcher.kpiPriority}: ${data.stats.prioritySos}`
          : null,
    },
    {
      label: t.dispatcher.kpiSafe,
      value: data.stats.safeCitizens,
      tone: "text-emerald-600",
      sub: null,
      icon: CheckmarkCircle02Icon,
      bg: "bg-emerald-500/10 text-emerald-600",
    },
    {
      label: t.dispatcher.kpiCritical,
      value: data.stats.criticalShelters,
      tone: "text-amber-600",
      sub: null,
      icon: Home01Icon,
      bg: "bg-amber-500/10 text-amber-600",
    },
    {
      label: t.dispatcher.kpiTeams,
      value: data.stats.availableTeams,
      tone: "",
      sub: null,
      icon: UserGroup03Icon,
      bg: "bg-blue-500/10 text-blue-600",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400"
        >
          {t.dispatcher.error}
        </p>
      )}
      <div className="flex items-center justify-end gap-3">
        {health && (
          <Badge
            variant={degraded ? "secondary" : "outline"}
            className={cn(degraded && "bg-amber-100 text-amber-900")}
          >
            {t.provider.chipLabel}:{" "}
            {health.state === "half_open"
              ? t.provider.chipRecovering
              : degraded
                ? t.provider.chipFallback
                : t.provider.chipLive}
          </Badge>
        )}
        <span className="text-muted-foreground mr-auto hidden text-xs md:inline">
          {t.dispatcher.simulatorHelp}
        </span>
        <SimulatorPanel map={map} onChanged={load} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <span className={cn("text-3xl font-semibold", k.tone)}>{k.value}</span>
                <span className="text-muted-foreground text-sm">{k.label}</span>
                {k.sub && <span className="text-xs font-semibold text-red-600">{k.sub}</span>}
              </div>
              <span className={cn("flex size-10 items-center justify-center rounded-xl", k.bg)}>
                <HugeiconsIcon icon={k.icon} size={22} aria-hidden="true" />
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{t.dispatcher.alerts}</h2>
        <p className="text-muted-foreground text-sm">{t.dispatcher.alertsHelp}</p>
        {data.alerts.length === 0 ? (
          <Empty>{`${t.dispatcher.noAlerts} ${t.dispatcher.noAlertsHint}`}</Empty>
        ) : (
          data.alerts.map((a) => (
            <div
              key={a.id}
              role="alert"
              className="flex flex-col gap-3 rounded-xl border border-red-500 bg-red-500/15 p-4"
            >
              <div className="flex animate-pulse items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-red-600 text-white">
                    <HugeiconsIcon
                      icon={a.kind === "sos_cluster" ? AmbulanceIcon : Home01Icon}
                      size={18}
                      aria-hidden="true"
                    />
                  </span>
                  <div>
                    <p className="font-semibold text-red-700 dark:text-red-400">
                      {a.kind === "sos_cluster"
                        ? t.dispatcher.alertCluster
                        : t.dispatcher.alertOverload}{" "}
                      · {a.zoneName}
                    </p>
                    <p className="text-muted-foreground text-sm">{a.message}</p>
                  </div>
                </div>
                <div className="text-muted-foreground text-right text-sm">
                  {a.kind === "sos_cluster" && (
                    <p>
                      {t.dispatcher.sosCount}: {a.sosCount}
                    </p>
                  )}
                  <p>
                    {minutesAgo(a.createdAt)} {t.dispatcher.min} {t.dispatcher.ago}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button disabled={busyId === a.id} onClick={() => handleAlert(a.id, "approve")}>
                  {busyId === a.id ? "…" : t.dispatcher.approve}
                </Button>
                <Button
                  variant="outline"
                  disabled={busyId === a.id}
                  onClick={() => handleAlert(a.id, "dismiss")}
                >
                  {t.dispatcher.dismiss}
                </Button>
              </div>
            </div>
          ))
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{t.dispatcher.mapTitle}</h2>
          <CityMap
            data={map}
            sos={sosPoints}
            updatedAt={updatedAt}
            onRefresh={() => {
              setRefreshing(true);
              load();
              setTimeout(() => setRefreshing(false), 700);
            }}
            refreshing={refreshing}
            degraded={degraded}
            highlightSosId={selectedSos}
            focus={focusSos ? [focusSos] : undefined}
            fitKey={focusSos ? `sos-${focusSos.id}` : undefined}
          />
          {data.closedEdges.length > 0 && (
            <p className="text-muted-foreground text-sm">
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
                    <TableRow
                      key={s.id}
                      tabIndex={0}
                      aria-selected={selectedSos === s.id}
                      onClick={() => setSelectedSos(selectedSos === s.id ? null : s.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedSos(selectedSos === s.id ? null : s.id);
                        }
                      }}
                      className={cn(
                        "cursor-pointer",
                        s.priority > 0 && "bg-red-500/10",
                        selectedSos === s.id && "ring-2 ring-blue-600 ring-inset",
                      )}
                    >
                      <TableCell className="font-medium">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              "flex size-6 items-center justify-center rounded-full text-white",
                              SOS_SWATCH[s.type],
                            )}
                          >
                            <HugeiconsIcon icon={SOS_ICON[s.type]} size={13} aria-hidden="true" />
                          </span>
                          {s.priority > 0 && (
                            <Badge variant="destructive">{t.dispatcher.priorityBadge}</Badge>
                          )}
                          {t.dispatcher.sosTypes[s.type]}
                        </div>
                      </TableCell>
                      <TableCell>{s.zoneName}</TableCell>
                      <TableCell>
                        <Badge variant={s.status === "new" ? "destructive" : "secondary"}>
                          {t.dispatcher.sosStatus[s.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-right">
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
                          <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
                            <div
                              className={cn("h-full", pctColor(s.occupancyPct))}
                              style={{ width: `${Math.min(100, s.occupancyPct)}%` }}
                            />
                          </div>
                          <span className="w-10 text-right text-sm tabular-nums">
                            {s.occupancyPct}%
                          </span>
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
