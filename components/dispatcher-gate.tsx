"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { DispatcherView } from "@/components/dispatcher-view";
import { ApiError, api, type SessionRole } from "@/lib/api";
import { useT } from "@/lib/i18n/provider";

export function DispatcherGate() {
  const t = useT();
  const [role, setRole] = useState<SessionRole | null | undefined>(undefined);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    api
      .getSession()
      .then((s) => setRole(s.role))
      .catch(() => setRole(null));
  }, []);

  const onUnauthorized = useCallback(() => {
    setExpired(true);
    setRole(null);
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await api.login(pin);
      setPin("");
      setExpired(false);
      setRole(r.role);
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      setError(status === 401 ? t.auth.wrong : status === 429 ? t.auth.tooMany : t.auth.failed);
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await api.logout().catch(() => {});
    setRole(null);
  }

  if (role === undefined) return <Skeleton className="h-64 w-full rounded-xl" />;

  if (role === null) {
    return (
      <Card className="mx-auto max-w-sm">
        <CardContent>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold">{t.auth.title}</h2>
              <p className="text-muted-foreground text-sm">{expired ? t.auth.expired : t.auth.desc}</p>
            </div>
            <label className="flex flex-col gap-1 text-sm font-medium">
              {t.auth.pin}
              <Input
                type="password"
                inputMode="numeric"
                autoComplete="off"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                aria-invalid={error ? true : undefined}
              />
            </label>
            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}
            <Button type="submit" disabled={busy || pin.length === 0}>
              {busy ? "…" : t.auth.submit}
            </Button>
            <p className="text-muted-foreground text-xs">{t.auth.hint}</p>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end gap-2">
        <Badge variant="outline">{role === "dispatcher" ? t.auth.roleDispatcher : t.auth.roleViewer}</Badge>
        <Button size="sm" variant="outline" onClick={logout}>
          {t.auth.logout}
        </Button>
      </div>
      <DispatcherView role={role} onUnauthorized={onUnauthorized} />
    </div>
  );
}
