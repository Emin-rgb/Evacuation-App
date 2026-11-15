"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { DispatcherView } from "@/components/dispatcher-view";
import { ApiError, api, type SessionUser } from "@/lib/api";
import { useT } from "@/lib/i18n/provider";

export function DispatcherGate() {
  const t = useT();
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    api
      .getSession()
      .then((s) => setUser(s.user))
      .catch(() => setUser(null));
  }, []);

  const onUnauthorized = useCallback(() => {
    setExpired(true);
    setUser(null);
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await api.login(email, password);
      setPassword("");
      setExpired(false);
      setUser(r.user);
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      if (status === 423) {
        const minutes = Math.max(1, Math.ceil(((err as ApiError).retryAfterSec ?? 60) / 60));
        setError(t.auth.locked.replace("{m}", String(minutes)));
      } else {
        setError(status === 401 ? t.auth.wrong : status === 429 ? t.auth.tooMany : t.auth.failed);
      }
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await api.logout().catch(() => {});
    setUser(null);
  }

  if (user === undefined) return <Skeleton className="h-64 w-full rounded-xl" />;

  if (user === null) {
    return (
      <Card className="mx-auto max-w-sm">
        <CardContent>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold">{t.auth.title}</h2>
              <p className="text-muted-foreground text-sm">{expired ? t.auth.expired : t.auth.desc}</p>
            </div>
            <label className="flex flex-col gap-1 text-sm font-medium">
              {t.auth.email}
              <Input
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              {t.auth.password}
              <div className="flex gap-2">
                <Input
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={error ? true : undefined}
                />
                <Button type="button" variant="outline" onClick={() => setShowPw((v) => !v)} aria-pressed={showPw}>
                  {showPw ? t.auth.hidePassword : t.auth.showPassword}
                </Button>
              </div>
            </label>
            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}
            <Button type="submit" disabled={busy || email.length === 0 || password.length === 0}>
              {busy ? "…" : t.auth.submit}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end gap-2">
        <span className="text-sm font-medium">{user.name}</span>
        <Badge variant="outline">{user.role === "dispatcher" ? t.auth.roleDispatcher : t.auth.roleSupervisor}</Badge>
        <Button size="sm" variant="outline" onClick={logout}>
          {t.auth.logout}
        </Button>
      </div>
      <DispatcherView role={user.role} onUnauthorized={onUnauthorized} />
    </div>
  );
}
