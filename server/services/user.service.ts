import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { afterFailure, isLocked, secondsLeft } from "@/server/engine/lockout";
import { hashPassword, verifyPassword } from "@/server/engine/password";
import type { Role } from "@/server/engine/rbac";

export type SessionUser = { id: string; name: string; role: Role };
export type LoginResult =
  | { ok: true; user: SessionUser }
  | { ok: false; reason: "invalid" }
  | { ok: false; reason: "locked"; retryAfterSec: number };

// Verified against when the email is unknown, so response time does not reveal which emails exist.
let dummyHash: Promise<string> | null = null;
const getDummyHash = () => (dummyHash ??= hashPassword("not-a-real-password"));

export async function verifyLogin(email: string, password: string): Promise<LoginResult> {
  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) {
    await verifyPassword(password, await getDummyHash());
    return { ok: false, reason: "invalid" };
  }
  const now = new Date();
  if (isLocked(user.lockedUntil, now) && user.lockedUntil) {
    return { ok: false, reason: "locked", retryAfterSec: secondsLeft(user.lockedUntil, now) };
  }
  if (!(await verifyPassword(password, user.passwordHash))) {
    const next = afterFailure(user.failedAttempts, now);
    await db.update(users).set(next).where(eq(users.id, user.id));
    if (next.lockedUntil) return { ok: false, reason: "locked", retryAfterSec: secondsLeft(next.lockedUntil, now) };
    return { ok: false, reason: "invalid" };
  }
  if (user.failedAttempts > 0 || user.lockedUntil) {
    await db.update(users).set({ failedAttempts: 0, lockedUntil: null }).where(eq(users.id, user.id));
  }
  return { ok: true, user: { id: user.id, name: user.name, role: user.role } };
}
