"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { CitizenRole } from "@/lib/types";

const ID_KEY = "citizenId";
const ROLE_KEY = "citizenRole";

function read(key: string): string | null {
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
    /* storage unavailable: value lives in memory only */
  }
}

type Origin = { lat: number; lng: number } | null;

/** Anonymous citizen identity (uuid + role in localStorage). Creates the DB row lazily. */
export function useCitizen(origin: Origin) {
  const [citizenId, setCitizenId] = useState<string | null>(null);
  const [role, setRoleState] = useState<CitizenRole>("standard");
  const idRef = useRef<string | null>(null);
  const roleRef = useRef<CitizenRole>("standard");

  useEffect(() => {
    const id = read(ID_KEY);
    const r = read(ROLE_KEY) === "priority" ? "priority" : "standard";
    idRef.current = id;
    roleRef.current = r;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read after mount to keep SSR/hydration identical
    setCitizenId(id);
    setRoleState(r);
  }, []);

  const create = useCallback(async () => {
    const created = await api.createCitizen(origin?.lat, origin?.lng, roleRef.current);
    idRef.current = created.id;
    write(ID_KEY, created.id);
    setCitizenId(created.id);
    return created.id;
  }, [origin]);

  // A stored priority citizen may be unknown to the server (e.g. DB reseeded): re-register once so
  // routes keep honouring the role.
  const synced = useRef(false);
  useEffect(() => {
    const id = idRef.current;
    if (synced.current || !id || roleRef.current !== "priority") return;
    synced.current = true;
    api.setCitizenRole(id, "priority").catch(() => create().catch(() => {}));
  }, [citizenId, create]);

  /** Runs `fn` with a valid citizen id; recreates the citizen once if the stored id is stale (e.g. DB reseeded). */
  const withCitizen = useCallback(
    async <T>(fn: (id: string) => Promise<T>): Promise<T> => {
      const id = idRef.current ?? (await create());
      try {
        return await fn(id);
      } catch {
        return fn(await create());
      }
    },
    [create],
  );

  const setRole = useCallback(
    async (next: CitizenRole) => {
      const prev = roleRef.current;
      roleRef.current = next;
      setRoleState(next);
      write(ROLE_KEY, next);
      try {
        await withCitizen((id) => api.setCitizenRole(id, next));
      } catch {
        roleRef.current = prev;
        setRoleState(prev);
        write(ROLE_KEY, prev);
        throw new Error("role update failed");
      }
    },
    [withCitizen],
  );

  return { citizenId, role, setRole, withCitizen };
}
