/**
 * Every number the dashboard uses to decide "is this alright?".
 *
 * These were scattered across three layers that had no way to reach each other:
 * the SQL bucket expressions in `query.ts` cut device age at 5 and 7 years, the
 * Thai labels in `status.ts` spelled "5–7 ปี" as literal text, and the day clamp
 * lived once in the URL parser and again in the filter bar — whose comment
 * admitted the duplication rather than fixing it. Changing a boundary meant
 * finding every copy, and missing one produced a chart drawn at one threshold
 * under a legend claiming another.
 *
 * Kept free of SQL and of `import "server-only"` on purpose: the SQL templates
 * interpolate these as literals, `status.ts` interpolates them into labels, and
 * the filter bar needs the clamp in the browser. One file all three can import.
 */

/** Devices with no contact for this many days are treated as stale. */
export const STALE_DAYS = 30;

/** Warranty/lease ending within this many days counts as "ใกล้หมดประกัน". */
export const EXPIRING_SOON_DAYS = 90;

/**
 * The silence threshold is the one filter whose value the user types freely
 * rather than picking from a list, so it is the one that has to survive
 * `?stale=abc`, `?stale=-5` and `?stale=1e9`. One day is the smallest span the
 * data can express (`daysSinceSeen` is whole days) and ten years is past the age
 * of anything in the register, so anything beyond that is a typo.
 */
export const MIN_STALE_DAYS = 1;
export const MAX_STALE_DAYS = 3650;

/** Shared by the URL parser and the filter bar's own number box, so the box
 *  cannot offer a value the server would silently rewrite. */
export function clampStaleDays(days: number): number {
  return Math.min(MAX_STALE_DAYS, Math.max(MIN_STALE_DAYS, Math.trunc(days)));
}

/**
 * Contact buckets. A machine heard from within a week is simply fine; past that
 * it is "เริ่มเงียบ" until it crosses the stale threshold the reader set.
 */
export const CONTACT_OK_DAYS = 7;

/**
 * Age buckets, cut where the replacement conversation changes rather than at
 * even intervals: under five years is simply fine, five to seven is "start
 * budgeting", and past seven the machine is a replacement candidate.
 */
export const AGE_OLD_YEARS = 5;
export const AGE_ANCIENT_YEARS = 7;
