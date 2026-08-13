import {
  GENERATED_ON,
  WINDOWS_BUILDS,
  type WindowsRevision,
} from "./windows-releases";

/**
 * How far behind Microsoft a machine's Windows is.
 *
 * The dashboard used to answer this by comparing each PC's *feature version*
 * against the newest one anywhere in the fleet — which only ever said "22H2 is
 * behind 25H2". It could not tell a 25H2 machine patched last week from a 25H2
 * machine last patched in February, and those are the same machine as far as
 * the old "Windows ไม่ล่าสุด" count was concerned.
 *
 * The real patch level is `Build.UBR` — `26200.8973` — and Starcat stores both
 * halves. Compared against Microsoft's published revision history
 * (`windows-releases.ts`) that gives two numbers a helpdesk can act on: how
 * many releases this machine has skipped, and how long it has been sitting on
 * the one it has.
 *
 * Everything here is pure, so it runs at render time on rows the SQL already
 * fetched — no extra query, and nothing to keep in sync in two places.
 */
export type PatchStatus = {
  /** "26200.8973", for display. */
  level: string;
  /** The newest revision Microsoft has published for this build. */
  latest: WindowsRevision;
  /** The revision this machine is on, when Microsoft lists it. */
  current: WindowsRevision | null;
  /** Published revisions newer than this machine's. 0 = fully patched. */
  releasesBehind: number;
  /**
   * Days between this machine's revision and the newest one. Measured between
   * two *release* dates rather than against today, so a fleet that is entirely
   * up to date reads 0 rather than drifting upward until Patch Tuesday.
   */
  daysBehind: number | null;
  /** Microsoft has stopped shipping updates for this feature version. */
  unsupported: boolean;
  /** ISO date updates stop, when they still have not. */
  endOfServicing: string | null;
  /** Days until `endOfServicing`; negative once past. */
  daysUntilEndOfServicing: number | null;
  featureVersion: string | null;
  product: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS);
}

/** The reference table's build date, so the UI can admit when it is stale. */
export const REFERENCE_DATE = GENERATED_ON;

/**
 * Null when the build is not one Microsoft publishes a history for — an Insider
 * or Dev-channel build, or a machine with no agent reporting an OS at all.
 * Saying nothing is the right answer there; guessing would invent a patch gap.
 */
export function patchStatus(
  build: string | null | undefined,
  ubr: string | null | undefined,
): PatchStatus | null {
  if (!build) return null;

  const entry = WINDOWS_BUILDS[build];
  if (!entry || entry.revisions.length === 0) return null;

  const latest = entry.revisions[0];
  const ubrNumber = Number(ubr);
  const known = Number.isFinite(ubrNumber) ? ubrNumber : null;

  // `revisions` is newest first, so everything above this machine's UBR is a
  // release it has not taken. An unknown UBR still yields the servicing dates,
  // which are the half of this that does not depend on knowing the revision.
  const current =
    known === null
      ? null
      : (entry.revisions.find((revision) => revision.ubr === known) ?? null);

  const releasesBehind =
    known === null
      ? 0
      : entry.revisions.filter((revision) => revision.ubr > known).length;

  const today = new Date().toISOString().slice(0, 10);

  return {
    level: known === null ? build : `${build}.${known}`,
    latest,
    current,
    releasesBehind,
    daysBehind: current ? daysBetween(current.date, latest.date) : null,
    unsupported: entry.ended,
    endOfServicing: entry.endOfServicing,
    daysUntilEndOfServicing: entry.endOfServicing
      ? daysBetween(today, entry.endOfServicing)
      : null,
    featureVersion: entry.featureVersion,
    product: entry.product,
  };
}

/**
 * Ranked worst-first, matching how the dashboard colours everything else: red
 * is work already overdue, amber is work to schedule.
 *
 * A version Microsoft no longer patches outranks any number of missed updates,
 * because no amount of patching fixes it — the machine needs a new Windows.
 */
export type PatchSeverity = "unsupported" | "critical" | "warning" | "ok";

/** A quarter is about six monthly updates — past that, "behind" is not the word. */
const CRITICAL_DAYS = 90;

export function patchSeverity(status: PatchStatus | null): PatchSeverity {
  if (!status) return "ok";
  if (status.unsupported) return "unsupported";
  if (status.releasesBehind === 0) return "ok";
  return (status.daysBehind ?? 0) >= CRITICAL_DAYS ? "critical" : "warning";
}

/** "ตามหลัง 15 แพตช์ · 184 วัน" — the short form for a table cell. */
export function describePatchGap(status: PatchStatus | null): string | null {
  if (!status) return null;
  if (status.unsupported) return "Microsoft ไม่ออกอัพเดทให้แล้ว";
  if (status.releasesBehind === 0) return "อัพเดทครบแล้ว";

  const parts = [`ตามหลัง ${status.releasesBehind} แพตช์`];
  if (status.daysBehind !== null && status.daysBehind > 0) {
    parts.push(`${status.daysBehind} วัน`);
  }
  // An unrecognised UBR still counts as behind — Microsoft simply never
  // published it, which usually means a preview build.
  if (status.current === null) parts.push("(รุ่นนอกรายการ Microsoft)");

  return parts.join(" · ");
}
