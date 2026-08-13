import type { DeviceFilters, DeviceSort } from "./types";

/** Raw `searchParams` as Next.js hands them to a page. */
export type RawSearchParams = Record<string, string | string[] | undefined>;

/** Multi-value filters travel as repeated params: `?brand=HP&brand=Dell`. */
const MULTI_KEYS = [
  "deviceType",
  "category",
  "brand",
  "model",
  "department",
  "location",
  "windowsVersion",
] as const;

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

  for (const key of MULTI_KEYS) {
    const values = toArray(params[key]);
    if (values) filters[key] = values;
  }

  filters.search = toString(params.q);

  const online = toString(params.online);
  if (online === "true" || online === "false") filters.online = online;

  filters.warrantyWithinDays = toNumber(params.warrantyWithin);
  filters.staleDays = toNumber(params.stale);
  filters.minAgeYears = toNumber(params.minAge);
  if (toString(params.outdated) === "1") filters.outdatedOnly = true;

  // Strip undefined keys so `Object.keys(filters).length` is a truthful
  // "how many filters are active" for the UI badge.
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined),
  ) as DeviceFilters;
}

export function parseSort(params: RawSearchParams): DeviceSort | undefined {
  const column = toString(params.sort);
  if (!column) return undefined;
  return {
    column: column as DeviceSort["column"],
    direction: toString(params.dir) === "desc" ? "desc" : "asc",
  };
}

export function parsePage(params: RawSearchParams): number {
  return Math.max(1, Math.trunc(toNumber(params.page) ?? 1));
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
