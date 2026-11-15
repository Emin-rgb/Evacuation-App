"use client";

import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, ArrowRight01Icon, BulbIcon } from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

type Who = "citizen" | "dispatcher";
// who performs each of the 8 demo steps (texts live in the dictionary)
const STEP_WHO: Who[] = [
  "citizen",
  "dispatcher",
  "dispatcher",
  "citizen",
  "dispatcher",
  "dispatcher",
  "dispatcher",
  "citizen",
];
const KEY = "demo-guide-step";
const OPEN_KEY = "demo-guide-open";

function read(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable: the guide still works for this session */
  }
}

export function DemoGuide({ screen }: { screen: Who }) {
  const t = useT();
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(true);

  // restore saved state after mount (localStorage is not available on the server)
  useEffect(() => {
    const s = Number(read(KEY));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore from localStorage
    if (Number.isInteger(s) && s >= 0 && s < STEP_WHO.length) setStep(s);
    if (read(OPEN_KEY) === "0") setOpen(false);
  }, []);

  function go(n: number) {
    const next = Math.min(STEP_WHO.length - 1, Math.max(0, n));
    setStep(next);
    write(KEY, String(next));
  }
  function toggle() {
    setOpen((o) => {
      write(OPEN_KEY, o ? "0" : "1");
      return !o;
    });
  }

  const here = screen === "citizen" ? t.guide.hereCitizen : t.guide.hereDispatcher;
  const cur = t.guide.steps[step];
  const who = STEP_WHO[step];

  return (
    <section
      aria-label={t.guide.title}
      className="mb-6 flex flex-col gap-3 rounded-xl border bg-blue-50 p-4 text-sm dark:bg-blue-950/30"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="flex items-start gap-2">
          <HugeiconsIcon
            icon={BulbIcon}
            size={18}
            className="mt-0.5 shrink-0 text-blue-600"
            aria-hidden="true"
          />
          <span>{here}</span>
        </p>
        <Button variant="outline" size="sm" onClick={toggle} aria-expanded={open}>
          {open ? t.guide.hide : t.guide.show}
        </Button>
      </div>

      {open && (
        <div className="flex flex-col gap-3 rounded-lg border bg-background p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">
              {t.guide.step} {step + 1} {t.guide.of} {STEP_WHO.length}: {cur.title}
            </span>
            <Badge variant={who === "citizen" ? "default" : "secondary"}>{t.guide.who[who]}</Badge>
            {who !== screen && (
              <Badge variant="outline" className="border-amber-400 text-amber-700">
                {t.guide.otherScreen}
              </Badge>
            )}
          </div>
          <p>
            <span className="text-muted-foreground font-medium">{t.guide.doLabel}: </span>
            {cur.action}
          </p>
          <p>
            <span className="text-muted-foreground font-medium">{t.guide.seeLabel}: </span>
            {cur.see}
          </p>
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1" aria-hidden="true">
              {STEP_WHO.map((_, i) => (
                <span
                  key={i}
                  className={cn("size-2 rounded-full", i === step ? "bg-blue-600" : "bg-muted")}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={step === 0} onClick={() => go(step - 1)}>
                <HugeiconsIcon icon={ArrowLeft01Icon} size={16} aria-hidden="true" />
                {t.guide.back}
              </Button>
              <Button
                size="sm"
                disabled={step === STEP_WHO.length - 1}
                onClick={() => go(step + 1)}
              >
                {t.guide.next}
                <HugeiconsIcon icon={ArrowRight01Icon} size={16} aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
