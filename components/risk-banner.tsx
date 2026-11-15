"use client";

import { useCallback, useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert02Icon, ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useT } from "@/lib/i18n/provider";
import type { HazardRisk, RiskLevel, RiskSnapshot } from "@/lib/types";
import { cn } from "@/lib/utils";

const POLL_MS = 5000;

const LEVEL_STYLE: Record<RiskLevel, string> = {
  minimal: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  low: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  moderate: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  high: "bg-red-500/15 text-red-700 dark:text-red-400",
  critical: "bg-red-600 text-white",
};

const isElevated = (h: HazardRisk | null) => h?.level === "high" || h?.level === "critical";

function useRisk(zoneId?: string) {
  const [snap, setSnap] = useState<RiskSnapshot | null>(null);
  const [error, setError] = useState(false);
  const load = useCallback(() => {
    api
      .getRisk(zoneId)
      .then((s) => {
        setSnap(s);
        setError(false);
      })
      .catch(() => setError(true));
  }, [zoneId]);
  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);
  return { snap, error, load };
}

function LevelBadge({ level }: { level: RiskLevel }) {
  const t = useT();
  return <Badge className={cn("border-transparent", LEVEL_STYLE[level])}>{t.risk.levels[level]}</Badge>;
}

function Shell({
  children,
  tone,
  title,
  large,
  badge,
}: {
  children: React.ReactNode;
  tone: "calm" | "warn";
  title: string;
  large?: boolean;
  badge: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className={cn("rounded-xl border", tone === "warn" && "border-amber-500 bg-amber-500/10")}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 p-4 text-left"
      >
        <span className="flex items-center gap-2">
          <h2 className={cn("font-semibold", large && "text-lg")}>{title}</h2>
          {badge}
        </span>
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          size={18}
          aria-hidden="true"
          className={cn("shrink-0 transition-transform motion-reduce:transition-none", open && "rotate-180")}
        />
      </button>
      {open && <div className="flex flex-col gap-3 px-4 pb-4">{children}</div>}
    </div>
  );
}

function Unavailable({ error, onRetry }: { error: boolean; onRetry: () => void }) {
  const t = useT();
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-4 text-sm">
      <span className="text-muted-foreground">{t.risk.unavailable}</span>
      {error && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          {t.risk.retry}
        </Button>
      )}
    </div>
  );
}

/** Citizen: one compact advisory. Dispatcher: both hazards with their factors and operational hints. */
export function RiskBanner({
  variant,
  zoneId,
  onShowShelters,
}: {
  variant: "citizen" | "dispatcher";
  zoneId?: string;
  onShowShelters?: () => void;
}) {
  const t = useT();
  const { snap, error, load } = useRisk(zoneId);

  if (!snap) {
    if (error) return <Unavailable error onRetry={load} />;
    return <Skeleton className={cn("w-full rounded-xl", variant === "citizen" ? "h-24" : "h-40")} />;
  }
  if (snap.source === "unavailable") return <Unavailable error={false} onRetry={load} />;

  const { earthquake, flood, anomaly } = snap;
  const floodHigh = isElevated(flood);
  const quakeHigh = isElevated(earthquake) || !!anomaly?.isAnomalous;
  const sim = snap.source === "simulation" ? <Badge variant="outline">{t.risk.simulation}</Badge> : null;

  const factorText = (key: string, value?: number) =>
    ((t.risk.factors as Record<string, string>)[key] ?? key).replace("{v}", String(value ?? ""));

  const hazards = [
    { name: t.risk.earthquake, hazard: earthquake },
    { name: t.risk.flood, hazard: flood },
  ];

  if (variant === "citizen") {
    const message = floodHigh ? t.risk.citizenFlood : quakeHigh ? t.risk.citizenQuake : t.risk.citizenCalm;
    return (
      <Shell tone={floodHigh || quakeHigh ? "warn" : "calm"} title={t.risk.title} badge={sim}>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {hazards.map(
            ({ name, hazard }) =>
              hazard && (
                <span key={name} className="flex items-center gap-2">
                  {name}
                  <LevelBadge level={hazard.level} />
                </span>
              ),
          )}
        </div>
        <p className="text-sm">{message}</p>
        {(floodHigh || quakeHigh) && onShowShelters && (
          <Button size="sm" variant="outline" className="w-fit" onClick={onShowShelters}>
            {t.risk.showShelters}
          </Button>
        )}
      </Shell>
    );
  }

  return (
    <Shell tone={floodHigh || quakeHigh ? "warn" : "calm"} title={t.risk.title} large badge={sim}>
      <div className="grid gap-4 md:grid-cols-2">
        {hazards.map(({ name, hazard }) => (
          <div key={name} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">{name}</span>
              {hazard ? (
                <>
                  <LevelBadge level={hazard.level} />
                  <span className="text-muted-foreground text-sm">{Math.round(hazard.score)}/100</span>
                </>
              ) : (
                <span className="text-muted-foreground text-sm">{t.risk.unavailable}</span>
              )}
            </div>
            {hazard && (
              <ul className="text-muted-foreground list-disc pl-5 text-sm">
                {hazard.factors.map((f) => (
                  <li key={f.key}>{factorText(f.key, f.value)}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
      {anomaly?.isAnomalous && (
        <p role="status" className="flex items-start gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-400">
          <HugeiconsIcon icon={Alert02Icon} size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
          <span>
            <strong>{t.risk.anomalyTitle}.</strong> {t.risk.anomalyHint}
          </span>
        </p>
      )}
      {floodHigh && (
        <p role="status" className="rounded-lg bg-amber-500/15 p-3 text-sm">
          {t.risk.floodRerouteHint.replace("{v}", String(snap.rerouteThresholdPct))} {t.risk.preOpenHint}
        </p>
      )}
      <p className="text-muted-foreground text-xs">{t.risk.footnote}</p>
    </Shell>
  );
}
