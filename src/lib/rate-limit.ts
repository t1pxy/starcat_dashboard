import "server-only";

/**
 * A fixed-window request counter, held in this process's memory.
 *
 * The Excel export re-runs the whole filtered query unpaginated and builds a
 * workbook — the most expensive thing the dashboard can be asked to do, and the
 * one endpoint where a stuck retry loop or an over-eager click can put real load
 * on the helpdesk database. This puts a ceiling on how often one caller can ask.
 *
 * Deliberately in-process and dependency-free: the dashboard runs as a single
 * Next.js server on the office LAN, so there is no second instance for a shared
 * store to coordinate with. If it is ever run behind more than one instance this
 * becomes a per-instance limit, which is a weaker guarantee but not a wrong one.
 *
 * The limit is per client address and set well above what a person doing their
 * job would reach, because the office shares a small number of outbound
 * addresses — the target is a runaway loop, not a busy colleague.
 */
const windows = new Map<string, { count: number; resetAt: number }>();

export type RateLimitResult = {
  ok: boolean;
  /** Seconds until the window resets — for the `Retry-After` header. */
  retryAfterSeconds: number;
};

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();

  // Cheap sweep so a long-running server does not accumulate an entry per
  // address seen since boot. At this request volume the map holds a handful.
  for (const [entryKey, entry] of windows) {
    if (entry.resetAt <= now) windows.delete(entryKey);
  }

  const current = windows.get(key);
  if (!current || current.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSeconds: 0 };
  }

  current.count += 1;
  return {
    ok: current.count <= limit,
    retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
  };
}

/**
 * Who is asking, as well as we can tell without authentication.
 *
 * Behind a reverse proxy the socket address is the proxy's, so the forwarded
 * header is preferred where it exists. It is caller-controlled and therefore
 * trivially spoofed — which is acceptable here, because this limit exists to
 * stop an accidental loop rather than a determined attacker.
 */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
