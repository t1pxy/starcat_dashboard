import { DIMENSIONS } from "./dimensions";
import { clampStaleDays, STALE_DAYS } from "./thresholds";
import { isSortable, type DeviceSort } from "./sorting";
import type { DeviceFilters } from "./types";

/** Raw `searchParams` as Next.js hands them to a page. */
export type RawSearchParams = Record<string, string | string[] | undefined>;

function toArray(value: string | string[] | undefined): string[] | undefined {
  if (value === undefined) return undefined;
  const values = (Array.isArray(value) ? value : [value])
    .flatMap((entry) => entry.split(","))
    .map((entry) => entry.trim())
    .filter(Boolean);
  return values.length ? values : undefined;
}

function toNumber(value: string | string[] | undefined): number | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  if (first === undefined || first === "") return undefined;
  const parsed = Number(first);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Bounds every number that reaches SQL.
 *
 * `stale` was the only numeric parameter being clamped, so `?page=1e21`,
 * `?warrantyWithin=99999999999` and `?minAge=9999999` each reached the driver as
 * a value it could not represent and threw — turning a typo in the address bar
 * into a 500 error page. The bounds below are the widest the destination SQL
 * type can hold, so no value that works today is altered; only the ones that
 * used to crash are brought back inside the range.
 */
const SQL_INT_MIN = -2_147_483_648;
const SQL_INT_MAX = 2_147_483_647;

/** `warrantyDaysLeft` is compared against a `DECIMAL(5,1)`, which tops out at
 *  9999.9 — beyond that the driver rejects the parameter outright. */
const AGE_YEARS_LIMIT = 9999.9;

/** Offsets stay inside `int` at any page a person could plausibly reach; fifty
 *  million rows past the start is already far beyond the register's size. */
const MAX_PAGE = 1_000_000;

function toBoundedInt(
  value: string | string[] | undefined,
  min: number,
  max: number,
): number | undefined {
  const parsed = toNumber(value);
  if (parsed === undefined) return undefined;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

/** Same bounding, without the truncation — `?minAge=5.5` is a meaningful
 *  half-year that the destination decimal column can hold. */
function toBoundedDecimal(
  value: string | string[] | undefined,
  min: number,
  max: number,
): number | undefined {
  const parsed = toNumber(value);
  if (parsed === undefined) return undefined;
  return Math.min(max, Math.max(min, parsed));
}

function toString(value: string | string[] | undefined): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  const trimmed = first?.trim();
  return trimmed ? trimmed : undefined;
}

export function parseFilters(params: RawSearchParams): DeviceFilters {
  const filters: DeviceFilters = {};

  // Computers unless asked otherwise. The scope is only recorded when it is
  // widened, so the default costs nothing in the URL and does not read as an
  // "active filter" the user has to clear.
  if (toString(params.scope) === "all") filters.scope = "all";

  // Multi-value filters travel as repeated params: `?brand=HP&brand=Dell`.
  for (const key of DIMENSIONS) {
    const values = toArray(params[key]);
    if (values) filters[key] = values;
  }

  filters.search = toString(params.q);

  const online = toString(params.online);
  if (online === "true" || online === "false") filters.online = online;

  filters.warrantyWithinDays = toBoundedInt(
    params.warrantyWithin,
    SQL_INT_MIN,
    SQL_INT_MAX,
  );
  // Through the same clamp the filter bar's own number box uses, so the box
  // cannot offer a value the server would silently rewrite.
  const staleDays = toNumber(params.stale);
  filters.staleDays =
    staleDays === undefined ? undefined : clampStaleDays(staleDays);
  filters.minAgeYears = toBoundedDecimal(
    params.minAge,
    -AGE_YEARS_LIMIT,
    AGE_YEARS_LIMIT,
  );
  if (toString(params.outdated) === "1") filters.outdatedOnly = true;

  // Strip undefined keys so `Object.keys(filters).length` is a truthful
  // "how many filters are active" for the UI badge.
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined),
  ) as DeviceFilters;
}

/**
 * How many days of silence the page currently counts as "out of contact".
 *
 * `?stale=N` is deliberately one number doing one job: it both narrows the view
 * to the machines that have been quiet that long *and* is the number the tile,
 * the inactive-devices queue and the contact chart speak in. Two separate knobs
 * — one to filter, one to relabel — is how a page ends up filtered at 90 days
 * while a tile beside it still says 30.
 */
export function staleThreshold(filters: DeviceFilters): number {
  return filters.staleDays ?? STALE_DAYS;
}

/**
 * The sort in the URL, or nothing when it does not name a column the table can
 * actually order by.
 *
 * This used to cast whatever string arrived straight to `keyof Device`, so the
 * type claimed a guarantee nothing checked — the real protection was a
 * whitelist further down in the query builder. Validating here makes the type
 * honest and keeps the check in one place.
 */
export function parseSort(params: RawSearchParams): DeviceSort | undefined {
  const column = toString(params.sort);
  if (!column || !isSortable(column)) return undefined;
  return {
    column,
    direction: toString(params.dir) === "desc" ? "desc" : "asc",
  };
}

export function parsePage(params: RawSearchParams): number {
  return toBoundedInt(params.page, 1, MAX_PAGE) ?? 1;
}

/**
 * Number of active filter groups, for the "ล้างตัวกรอง" affordance.
 *
 * `scope` is excluded: widening to the full asset register is a change of what
 * you are looking at, not a restriction on it, and counting it would make
 * "showing everything" read as one filter deep.
 */
export function countActiveFilters(filters: DeviceFilters): number {
  return Object.entries(filters).filter(([key, value]) =>
    key === "scope" ? false : Array.isArray(value) ? value.length > 0 : value !== undefined,
  ).length;
}

/**
 * Rebuilds a query string from the current params plus a patch. Values set to
 * `null` are removed. Paging resets on every change except an explicit page
 * move, since landing on page 7 of a 2-page result is never what was meant.
 */
export function buildQueryString(
  current: RawSearchParams,
  patch: Record<string, string | string[] | null>,
): string {
  const next = new URLSearchParams();

  for (const [key, value] of Object.entries(current)) {
    if (value === undefined || key in patch) continue;
    for (const entry of Array.isArray(value) ? value : [value]) {
      if (entry) next.append(key, entry);
    }
  }

  for (const [key, value] of Object.entries(patch)) {
    if (value === null) continue;
    for (const entry of Array.isArray(value) ? value : [value]) {
      if (entry) next.append(key, entry);
    }
  }

  if (!("page" in patch)) next.delete("page");

  const queryString = next.toString();
  return queryString ? `?${queryString}` : "";
}
