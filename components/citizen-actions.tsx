"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { useT } from "@/lib/i18n/provider";
import type { SosType } from "@/lib/types";

const SOS_TYPES: SosType[] = ["fire", "collapse", "flood", "medical"];

type Props = {
  origin: { lat: number; lng: number } | null;
  withCitizen: <T>(fn: (id: string) => Promise<T>) => Promise<T>;
};

export function CitizenActions({ origin, withCitizen }: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [safe, setSafe] = useState(false);

  async function run(fn: (id: string) => Promise<void>, failMsg: string) {
    setBusy(true);
    try {
      await withCitizen(fn);
    } catch {
      toast.error(failMsg);
    } finally {
      setBusy(false);
    }
  }

  function sendSos(type: SosType) {
    if (!origin) return;
    setOpen(false);
    setSafe(false);
    void run(async (id) => {
      const res = await api.sendSos(id, type, origin.lat, origin.lng);
      toast.success(res.priority > 0 ? t.citizen.sosPriority : t.citizen.sosSent);
    }, t.citizen.sosFailed);
  }

  function imSafe() {
    void run(async (id) => {
      await api.markSafe(id);
      setSafe(true);
      toast.success(t.citizen.safeConfirmed);
    }, t.citizen.safeFailed);
  }

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background p-4">
        <div className="mx-auto flex max-w-6xl flex-col gap-2">
          {!origin && <p className="text-center text-sm text-muted-foreground">{t.citizen.sosNeedLocation}</p>}
          <div className="flex gap-3">
            <Button
              size="lg"
              variant="destructive"
              className="h-12 flex-1 rounded-xl text-base font-bold"
              disabled={busy || !origin}
              onClick={() => setOpen(true)}
            >
              {t.citizen.sos}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 flex-1 rounded-xl text-base"
              disabled={busy || safe}
              onClick={imSafe}
            >
              {safe ? t.citizen.safeDone : t.citizen.safe}
            </Button>
          </div>
        </div>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.citizen.sosTitle}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {SOS_TYPES.map((type) => (
              <Button
                key={type}
                variant="outline"
                className="h-20 text-base"
                disabled={busy}
                onClick={() => sendSos(type)}
              >
                {t.dispatcher.sosTypes[type]}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
