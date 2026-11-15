export const SOS_DUPLICATE_WINDOW_MS = 5 * 60 * 1000;
export const SOS_LIMITS = {
  perIp: { limit: 20, windowMs: 60_000 },
  perCitizen: { limit: 3, windowMs: 60_000 },
};

/** A citizen's new SOS is a duplicate while an earlier unresolved one is still inside the window. */
export function isDuplicateSos(
  previous: { createdAt: Date; status: string }[],
  now: Date = new Date(),
): boolean {
  return previous.some(
    (s) => s.status !== "resolved" && now.getTime() - s.createdAt.getTime() < SOS_DUPLICATE_WINDOW_MS,
  );
}
