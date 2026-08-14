import "server-only";

import { query, queryBatch, sql, type QueryParam } from "@/lib/db";
import { DIMENSIONS, type Dimension } from "./dimensions";
import { staleThreshold } from "./filters";
import { DEVICE_SOURCE } from "./schema";
import { SORTABLE_COLUMNS, type DeviceSort } from "./sorting";
import {
  AGE_ANCIENT_YEARS,
  AGE_OLD_YEARS,
  CONTACT_OK_DAYS,
  EXPIRING_SOON_DAYS,
} from "./thresholds";
import type {
  Breakdown,
  DepartmentHealth,
  Device,
  DeviceFilters,
  DeviceScope,
  Distributions,
  Facets,
  FacetValue,
  FleetComposition,
  Summary,
} from "./types";

/**
 * Names that follow the asset scheme — `25PDT001`: two-digit ค.ศ. year, P/R for
 * ซื้อ/เช่า, DT/NB for ตั้งโต๊ะ/โน้ตบุ๊ก, then a running number.
 *
 * Deliberately the same shape the TypeScript parser accepts
 * (`src/lib/devices/device-name.ts`), so a row the SQL counts is a row the UI
 * can also decode.
 *
 * Takes the table alias because the same test is applied both to the source
 * table (`dev.`) and to the materialised `#dev` (no alias).
 */
function nameMatchesScheme(prefix: string): string {
  return `${prefix}deviceName LIKE '[0-9][0-9][PR]%'
      AND SUBSTRING(${prefix}deviceName, 4, 2) IN ('DT', 'NB')`;
}

/**
 * What counts as part of the fleet, before any user filter narrows it.
 *
 * Two rules, and they have to be applied identically everywhere or the page
 * contradicts itself:
 *
 *   - Monitoring is about machines you can patch and reach, so the default
 *     scope is computers. The equipment register has no OS, no agent and no
 *     contact history, and leaving it in only dilutes every health figure.
 *   - Computers whose name does not follow the asset scheme are spares, test
 *     builds and hand-named one-offs (DESKTOP-VGKC2IQ, IHL-ADOBE). Counting
 *     them made every fleet figure slightly wrong. Only computers are held to
 *     it — no printer was ever going to be called 25PDT001.
 *
 * `loadFacets` used to apply only the first rule, which is why a dropdown could
 * offer a brand that existed on no machine the page would actually show, with a
 * count that never matched the result.
 */
function fleetConditions(scope: DeviceScope | undefined, prefix: string): string[] {
  const conditions: string[] = [];
  if (scope !== "all") conditions.push(`${prefix}deviceType = 'COMPUTER'`);
  conditions.push(
    `${prefix}deviceType <> 'COMPUTER' OR (${nameMatchesScheme(prefix)})`,
  );
  return conditions;
}

/**
 * "Out of contact" — the one definition, used by all four things that speak it.
 *
 * A managed PC that has gone quiet for longer than the current threshold, or
 * that has never reported at all. The KPI tile used to count neither the
 * never-seen machines nor restrict itself to computers, while the queue beneath
 * it and the per-department column did both — so under `?scope=all` the tile
 * said 24 and the list under it showed 6, and both were describing "the same"
 * set. A machine that has never checked in is the least accounted for of all,
 * so it belongs in the count rather than outside it.
 */
function stalePredicate(prefix = ""): string {
  return `${prefix}deviceType = 'COMPUTER'
      AND (${prefix}daysSinceSeen IS NULL OR ${prefix}daysSinceSeen >= @staleThreshold)`;
}

const STALE_PREDICATE = stalePredicate();

/** Escapes the three characters SQL Server treats as LIKE wildcards, using
 *  backslash — which the `ESCAPE '\'` clause on every LIKE below declares. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_[]/g, (character) => `\\${character}`);
}

/**
 * Turns the filter object into a parameterised WHERE clause. Values are only
 * ever bound through `request.input`, never interpolated, so a department name
 * containing an apostrophe (or worse) cannot alter the statement.
 */
function buildWhere(filters: DeviceFilters): {
  conditions: string[];
  params: QueryParam[];
} {
  const conditions: string[] = [];
  const params: QueryParam[] = [];

  // Scope and the naming rule first, so every other condition narrows within
  // the same fleet the facets and the charts are counting.
  conditions.push(...fleetConditions(filters.scope, "dev."));

  const addIn = (column: string, values: string[] | undefined) => {
    if (!values?.length) return;
    const names = values.map((value, index) => {
      const name = `${column}_${index}`;
      params.push({ name, type: sql.NVarChar(400), value });
      return `@${name}`;
    });
    conditions.push(`dev.${column} IN (${names.join(", ")})`);
  };

  for (const dimension of DIMENSIONS) addIn(dimension, filters[dimension]);

  if (filters.search) {
    // `%`, `_` and `[` are LIKE wildcards, so a search for "50%" or "C:\" used
    // to match far more than the reader asked for — "%" on its own matched
    // everything. Escaped here and declared with ESCAPE below, so the box
    // searches for the characters that were typed.
    params.push({
      name: "search",
      type: sql.NVarChar(200),
      value: `%${escapeLike(filters.search)}%`,
    });
    conditions.push(`(
      dev.deviceName   LIKE @search ESCAPE '\\' OR
      dev.assetNumber  LIKE @search ESCAPE '\\' OR
      dev.serialNumber LIKE @search ESCAPE '\\' OR
      dev.ownerName    LIKE @search ESCAPE '\\' OR
      dev.ownerId      LIKE @search ESCAPE '\\' OR
      dev.ipAddress    LIKE @search ESCAPE '\\' OR
      dev.model        LIKE @search ESCAPE '\\' OR
      dev.department   LIKE @search ESCAPE '\\'
    )`);
  }

  if (filters.online === "true") conditions.push("dev.online = 1");
  if (filters.online === "false") conditions.push("dev.online = 0");

  if (filters.warrantyWithinDays !== undefined) {
    params.push({
      name: "warrantyWithinDays",
      type: sql.Int,
      value: filters.warrantyWithinDays,
    });
    conditions.push(
      "dev.warrantyDaysLeft IS NOT NULL AND dev.warrantyDaysLeft <= @warrantyWithinDays",
    );
  }

  if (filters.staleDays !== undefined) {
    // The same predicate the tile, the queue and the department column use —
    // `@staleThreshold` is bound once by `materialise`, because the threshold
    // also decides what all three of those count.
    conditions.push(stalePredicate("dev."));
  }

  if (filters.minAgeYears !== undefined) {
    params.push({
      name: "minAgeYears",
      type: sql.Decimal(5, 1),
      value: filters.minAgeYears,
    });
    conditions.push("dev.ageYears >= @minAgeYears");
  }

  if (filters.outdatedOnly) {
    conditions.push(
      "dev.windowsVersion IS NOT NULL AND dev.windowsVersion < dev.newestWindowsVersion",
    );
  }

  return { conditions, params };
}

/**
 * Materialises the filtered device set into a session-scoped `#dev` table.
 *
 * The flattened source is a ten-way join over the Starcat schema; evaluating it
 * once per question (summary, six breakdowns, page, count, update list) is what
 * made the first version of this page slow. Everything below reads `#dev`.
 */
function materialise(filters: DeviceFilters): {
  prelude: string;
  params: QueryParam[];
} {
  const { conditions, params } = buildWhere(filters);
  const where = conditions.length
    ? ` WHERE ${conditions.map((condition) => `(${condition})`).join(" AND ")}`
    : "";

  // Always bound, filtered or not: every statement below asks "how long is too
  // long to hear nothing", and binding it once here is what keeps the tile, the
  // queue and the contact chart from each answering with a different number.
  params.push({
    name: "staleThreshold",
    type: sql.Int,
    value: staleThreshold(filters),
  });

  return {
    prelude: `SELECT * INTO #dev FROM (${DEVICE_SOURCE}) AS dev${where};`,
    params,
  };
}

const SUMMARY_SELECT = `
SELECT
  COUNT(*)                                                      AS total,
  SUM(CASE WHEN online = 1 THEN 1 ELSE 0 END)                   AS onlineCount,
  SUM(CASE WHEN online = 0 THEN 1 ELSE 0 END)                   AS offline,
  SUM(CASE WHEN deviceType = 'COMPUTER' THEN 1 ELSE 0 END)      AS computers,
  SUM(CASE WHEN deviceType <> 'COMPUTER' THEN 1 ELSE 0 END)     AS equipment,
  SUM(CASE WHEN windowsVersion IS NOT NULL
            AND windowsVersion < newestWindowsVersion
           THEN 1 ELSE 0 END)                                   AS outdatedWindows,
  SUM(CASE WHEN ${STALE_PREDICATE} THEN 1 ELSE 0 END)            AS staleAgents,
  SUM(CASE WHEN warrantyDaysLeft < 0 THEN 1 ELSE 0 END)         AS warrantyExpired,
  SUM(CASE WHEN warrantyDaysLeft BETWEEN 0 AND ${EXPIRING_SOON_DAYS}
           THEN 1 ELSE 0 END)                                   AS warrantyExpiring90,
  ROUND(AVG(ageYears), 1)                                       AS averageAgeYears,
  MAX(newestWindowsVersion)                                     AS newestWindowsVersion
FROM #dev;`;

/**
 * All breakdowns in one statement. `ROW_NUMBER` per dimension applies the
 * top-N cut, which a plain UNION ALL could not express.
 */
function breakdownSelect(limit: number): string {
  const unions = DIMENSIONS.map(
    (dimension) =>
      `SELECT '${dimension}' AS dim, ${dimension} AS label, COUNT(*) AS cnt FROM #dev GROUP BY ${dimension}`,
  ).join("\n  UNION ALL\n  ");

  return `
SELECT dim, label, cnt FROM (
  SELECT dim, label, cnt,
         ROW_NUMBER() OVER (PARTITION BY dim ORDER BY cnt DESC, label ASC) AS rn
  FROM (
  ${unions}
  ) AS grouped
) AS ranked
WHERE rn <= ${limit}
ORDER BY dim, cnt DESC;`;
}

/**
 * Fleet health per department: how many machines a department runs, how many
 * are answering right now, and how much work is outstanding on them.
 *
 * This is the monitoring question — "is my department alright?" — which the
 * plain count-per-department bar could not answer, because a department with
 * 40 devices and 40 problems looked exactly like one with 40 and none.
 */
const DEPARTMENT_HEALTH_SELECT = `
SELECT TOP 25
  department,
  COUNT(*)                                                     AS total,
  SUM(CASE WHEN online = 1 THEN 1 ELSE 0 END)                  AS onlineCount,
  SUM(CASE WHEN windowsVersion IS NOT NULL
            AND windowsVersion < newestWindowsVersion
           THEN 1 ELSE 0 END)                                  AS outdated,
  SUM(CASE WHEN ${STALE_PREDICATE} THEN 1 ELSE 0 END)          AS stale
FROM #dev
GROUP BY department
ORDER BY total DESC;`;

/**
 * The four "how is the fleet doing" distributions, in one statement.
 *
 * Each bucket expression appears twice — once in the SELECT and once in the
 * GROUP BY — because SQL Server will not let GROUP BY reference a column alias.
 * They are named constants so the two copies cannot drift apart.
 */
// The threshold is tested *first* so the buckets stay in order however low it
// is set: at `?stale=3` a machine five days quiet is lost, not "ปกติ".
const CONTACT_BUCKET = `
  CASE WHEN daysSinceSeen IS NULL                THEN 'never'
       WHEN daysSinceSeen >= @staleThreshold     THEN 'lost'
       WHEN daysSinceSeen <= ${CONTACT_OK_DAYS}  THEN 'ok'
       ELSE 'slow' END`;

const WARRANTY_BUCKET = `
  CASE WHEN warrantyDaysLeft IS NULL                  THEN 'unknown'
       WHEN warrantyDaysLeft < 0                      THEN 'expired'
       WHEN warrantyDaysLeft <= ${EXPIRING_SOON_DAYS} THEN 'soon'
       ELSE 'ok' END`;

const WINDOWS_BUCKET = `
  CASE WHEN windowsVersion IS NULL                THEN 'unknown'
       WHEN windowsVersion < newestWindowsVersion THEN 'behind'
       ELSE 'current' END`;

// Boundaries come from `thresholds.ts`, which is also where `status.ts` reads
// them to build the Thai labels — a bar drawn at one cut-off under a legend
// naming another is worse than no bar at all.
const AGE_BUCKET = `
  CASE WHEN ageYears IS NULL                THEN 'unknown'
       WHEN ageYears < ${AGE_OLD_YEARS}     THEN 'new'
       WHEN ageYears < ${AGE_ANCIENT_YEARS} THEN 'old'
       ELSE 'ancient' END`;

const DISTRIBUTION_SELECT = `
SELECT 'contact' AS dim, ${CONTACT_BUCKET} AS bucket, COUNT(*) AS cnt
  FROM #dev GROUP BY ${CONTACT_BUCKET}
UNION ALL
SELECT 'warranty', ${WARRANTY_BUCKET}, COUNT(*)
  FROM #dev GROUP BY ${WARRANTY_BUCKET}
UNION ALL
SELECT 'windows', ${WINDOWS_BUCKET}, COUNT(*)
  FROM #dev GROUP BY ${WINDOWS_BUCKET}
UNION ALL
SELECT 'age', ${AGE_BUCKET}, COUNT(*)
  FROM #dev GROUP BY ${AGE_BUCKET};`;

/**
 * Ownership, form factor and purchase year, decoded out of the device name.
 *
 * `25PDT001` = year 2025 (ค.ศ.), P = ซื้อ / R = เช่า, DT = ตั้งโต๊ะ / NB =
 * โน้ตบุ๊ก. None of these three facts exists as its own column, and
 * purchased-versus-leased in particular decides who pays to replace a machine,
 * so it is worth reading out of the name rather than leaving it encoded.
 *
 * Non-conforming computers are filtered out of `#dev` upstream, so the
 * remainder this reports is now only the equipment register under `scope=all`.
 */
const NAME_PATTERN = nameMatchesScheme("");

const NAMING_SELECT = `
SELECT
  SUBSTRING(deviceName, 1, 2) AS yr,
  SUBSTRING(deviceName, 3, 1) AS ownership,
  SUBSTRING(deviceName, 4, 2) AS formFactor,
  COUNT(*)                    AS cnt
FROM #dev
WHERE ${NAME_PATTERN}
GROUP BY SUBSTRING(deviceName, 1, 2),
         SUBSTRING(deviceName, 3, 1),
         SUBSTRING(deviceName, 4, 2)
ORDER BY yr ASC;`;

/**
 * The two work queues, kept apart because they are two different jobs.
 *
 * `OUTDATED` is "patch this machine": it is reachable, it just runs an older
 * Windows feature version than the newest one in the fleet. Oldest version
 * first, so the machines furthest behind lead the list.
 *
 * `STALE` is "find this machine": a managed PC silent for longer than the
 * current threshold (`?stale=N`, 30 days by default), or that has never
 * reported at all, cannot be patched until somebody works out where it went.
 * Longest silence first, and the ones that never checked in lead — they are the
 * least accounted for.
 *
 * A machine can be in both lists, and when it is, both statements are true of
 * it; suppressing it from one would hide real work.
 */
const OUTDATED_WHERE = `windowsVersion IS NOT NULL AND windowsVersion < newestWindowsVersion`;

const OUTDATED_ORDER = `
  ORDER BY windowsVersion ASC,
           CASE WHEN deviceName IS NULL THEN 1 ELSE 0 END, deviceName ASC`;

const STALE_WHERE = STALE_PREDICATE;

const STALE_ORDER = `
  ORDER BY CASE WHEN daysSinceSeen IS NULL THEN 0 ELSE 1 END,
           daysSinceSeen DESC,
           CASE WHEN deviceName IS NULL THEN 1 ELSE 0 END, deviceName ASC`;

function orderBy(sort: DeviceSort | undefined): string {
  // `parseSort` has already rejected anything not on the list; checking again
  // here is what keeps that true for any other caller, since this is the one
  // place a column name is interpolated rather than bound.
  const column =
    sort && SORTABLE_COLUMNS.includes(sort.column) ? sort.column : "deviceName";
  const direction = sort?.direction === "desc" ? "DESC" : "ASC";
  // NULLs last regardless of direction: blank names are noise, not data.
  return `ORDER BY CASE WHEN ${column} IS NULL THEN 1 ELSE 0 END, ${column} ${direction}, agentId`;
}

/** A row straight off `#dev`: every `Device` field, plus the fleet-wide newest
 *  Windows version the SELECT carries along, and dates still as `Date` objects. */
type RawDevice = Device & { newestWindowsVersion: string | null };

/** Result sets whose columns the caller does not model field by field. */
type RawRows = Record<string, unknown>[];

/** SQL Server hands back `Date` objects; the UI wants stable ISO strings. */
function toIso(value: unknown): string | null {
  return value instanceof Date ? value.toISOString() : (value as string | null);
}

function normalise(row: RawDevice): Device {
  return {
    ...row,
    online: Boolean(row.online),
    buyDate: toIso(row.buyDate),
    warrantyEnd: toIso(row.warrantyEnd),
    lastSeen: toIso(row.lastSeen),
    osInstallDate: toIso(row.osInstallDate),
    lastSoftwareUpdate: toIso(row.lastSoftwareUpdate),
    lastBoot: toIso(row.lastBoot),
  };
}

function toSummary(row: Record<string, unknown> | undefined): Summary {
  const source = row ?? {};
  const count = (key: string) => Number(source[key] ?? 0);
  return {
    total: count("total"),
    online: count("onlineCount"),
    offline: count("offline"),
    computers: count("computers"),
    equipment: count("equipment"),
    outdatedWindows: count("outdatedWindows"),
    staleAgents: count("staleAgents"),
    warrantyExpired: count("warrantyExpired"),
    warrantyExpiring90: count("warrantyExpiring90"),
    averageAgeYears:
      source.averageAgeYears === null || source.averageAgeYears === undefined
        ? null
        : Number(source.averageAgeYears),
    newestWindowsVersion: (source.newestWindowsVersion as string | null) ?? null,
  };
}

function toBreakdowns(
  rows: Record<string, unknown>[],
): Record<Dimension, Breakdown[]> {
  const result = Object.fromEntries(
    DIMENSIONS.map((dimension) => [dimension, [] as Breakdown[]]),
  ) as Record<Dimension, Breakdown[]>;

  for (const row of rows) {
    const dimension = row.dim as Dimension;
    if (!result[dimension]) continue;
    result[dimension].push({
      // A large unknown bucket is itself a finding, so NULL is surfaced rather
      // than dropped.
      label: (row.label as string | null) ?? "ไม่ระบุ",
      count: Number(row.cnt),
    });
  }
  return result;
}

export type TablesData = {
  summary: Summary;
  devices: Device[];
  total: number;
  /** Reachable machines running an older Windows feature version. */
  outdated: Device[];
  /** Managed PCs that have gone quiet, or never reported at all. */
  stale: Device[];
};

export type ChartsData = {
  summary: Summary;
  breakdowns: Record<Dimension, Breakdown[]>;
  departments: DepartmentHealth[];
  distributions: Distributions;
  composition: FleetComposition;
};

function toDepartments(rows: Record<string, unknown>[]): DepartmentHealth[] {
  return rows.map((row) => {
    const total = Number(row.total ?? 0);
    const online = Number(row.onlineCount ?? 0);
    return {
      department: (row.department as string | null) ?? "ไม่ระบุ",
      total,
      online,
      offline: total - online,
      outdated: Number(row.outdated ?? 0),
      stale: Number(row.stale ?? 0),
    };
  });
}

function toDistributions(rows: Record<string, unknown>[]): Distributions {
  const result: Distributions = {
    contact: {},
    warranty: {},
    windows: {},
    age: {},
  };
  for (const row of rows) {
    const dimension = row.dim as keyof Distributions;
    if (!result[dimension]) continue;
    result[dimension][String(row.bucket)] = Number(row.cnt ?? 0);
  }
  return result;
}

/**
 * Folds the per-(year, ownership, form factor) counts into the three views the
 * page actually shows. One grouped query serves all three, so the totals across
 * them are guaranteed to agree.
 */
function toComposition(
  rows: Record<string, unknown>[],
  fleetTotal: number,
): FleetComposition {
  const ownership = { owned: 0, leased: 0 };
  const formFactor = { desktop: 0, laptop: 0 };
  const years = new Map<number, { owned: number; leased: number }>();
  let decoded = 0;

  for (const row of rows) {
    const count = Number(row.cnt ?? 0);
    const owned = String(row.ownership).toUpperCase() === "P";
    const desktop = String(row.formFactor).toUpperCase() === "DT";
    // Two digits are unambiguous here: the fleet is nowhere near a century old.
    const year = 2000 + Number(row.yr);

    decoded += count;
    ownership[owned ? "owned" : "leased"] += count;
    formFactor[desktop ? "desktop" : "laptop"] += count;

    const bucket = years.get(year) ?? { owned: 0, leased: 0 };
    bucket[owned ? "owned" : "leased"] += count;
    years.set(year, bucket);
  }

  return {
    ownership,
    formFactor,
    byYear: [...years.entries()]
      .sort(([a], [b]) => a - b)
      .map(([year, counts]) => ({ year, ...counts })),
    undecoded: Math.max(0, fleetTotal - decoded),
  };
}

/**
 * Everything the tables view renders, in one round trip. Because all five
 * result sets read the same `#dev` table, the tiles, the two work queues and
 * the device list can never disagree about what is being shown.
 *
 * The breakdowns are deliberately absent: they live on their own route now, and
 * grouping seven dimensions is work this page would only throw away.
 */
export async function getTables(
  filters: DeviceFilters,
  options: {
    sort?: DeviceSort;
    page?: number;
    pageSize?: number;
    queueLimit?: number;
  } = {},
): Promise<TablesData> {
  const { sort, page = 1, pageSize = 50, queueLimit = 200 } = options;
  const { prelude, params } = materialise(filters);

  // Bound rather than interpolated. These are the only numbers in the whole
  // dashboard that reach SQL from a URL, and pasting them into the statement as
  // text meant `?page=1e21` arrived as the literal `OFFSET 1e+21 ROWS` — a
  // syntax error, and a 500 page, from a typo in the address bar.
  const paging: QueryParam[] = [
    {
      name: "offset",
      type: sql.Int,
      value: Math.max(0, (page - 1) * pageSize),
    },
    { name: "pageSize", type: sql.Int, value: pageSize },
    { name: "queueLimit", type: sql.Int, value: queueLimit },
  ];

  const [summaryRows, deviceRows, outdatedRows, staleRows] = await queryBatch<
    [RawRows, RawDevice[], RawDevice[], RawDevice[]]
  >(
    `${prelude}
     ${SUMMARY_SELECT}
     SELECT * FROM #dev ${orderBy(sort)}
       OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY;
     SELECT TOP (@queueLimit) * FROM #dev
       WHERE ${OUTDATED_WHERE}
       ${OUTDATED_ORDER};
     SELECT TOP (@queueLimit) * FROM #dev
       WHERE ${STALE_WHERE}
       ${STALE_ORDER};
     DROP TABLE #dev;`,
    [...params, ...paging],
  );

  // `SUMMARY_SELECT` already counts `#dev`, so the separate `SELECT COUNT(*)`
  // this used to run was a second scan answering a question already answered.
  const summary = toSummary(summaryRows[0]);

  return {
    summary,
    devices: deviceRows.map(normalise),
    total: summary.total,
    outdated: outdatedRows.map(normalise),
    stale: staleRows.map(normalise),
  };
}

/** The charts view: the KPI tiles for context, per-department health, the fleet
 *  status distributions, what the naming scheme reveals, and every breakdown. */
export async function getCharts(
  filters: DeviceFilters,
  options: { breakdownLimit?: number } = {},
): Promise<ChartsData> {
  const { breakdownLimit = 10 } = options;
  const { prelude, params } = materialise(filters);

  const [
    summaryRows,
    departmentRows,
    distributionRows,
    namingRows,
    breakdownRows,
  ] = await queryBatch<[RawRows, RawRows, RawRows, RawRows, RawRows]>(
    `${prelude}
     ${SUMMARY_SELECT}
     ${DEPARTMENT_HEALTH_SELECT}
     ${DISTRIBUTION_SELECT}
     ${NAMING_SELECT}
     ${breakdownSelect(breakdownLimit)}
     DROP TABLE #dev;`,
    params,
  );

  const summary = toSummary(summaryRows[0]);

  return {
    summary,
    departments: toDepartments(departmentRows),
    distributions: toDistributions(distributionRows),
    composition: toComposition(namingRows, summary.total),
    breakdowns: toBreakdowns(breakdownRows),
  };
}

export type ExportData = {
  devices: Device[];
  summary: Summary;
  outdated: Device[];
  stale: Device[];
};

/** The export's unpaginated equivalent — same filters, same sort, every row,
 *  and the same split into two work queues that the screen shows. */
export async function getExportData(
  filters: DeviceFilters,
  sort?: DeviceSort,
): Promise<ExportData> {
  const { prelude, params } = materialise(filters);

  const [summaryRows, deviceRows, outdatedRows, staleRows] = await queryBatch<
    [RawRows, RawDevice[], RawDevice[], RawDevice[]]
  >(
    `${prelude}
     ${SUMMARY_SELECT}
     SELECT * FROM #dev ${orderBy(sort)};
     SELECT * FROM #dev WHERE ${OUTDATED_WHERE} ${OUTDATED_ORDER};
     SELECT * FROM #dev WHERE ${STALE_WHERE} ${STALE_ORDER};
     DROP TABLE #dev;`,
    params,
  );

  return {
    summary: toSummary(summaryRows[0]),
    devices: deviceRows.map(normalise),
    outdated: outdatedRows.map(normalise),
    stale: staleRows.map(normalise),
  };
}

/**
 * Why this is the only cache in the dashboard.
 *
 * Every page here is a live reading of the helpdesk database, and that is the
 * product: somebody looks at the wall display to find out whether a machine is
 * answering *now*. A `revalidate` window would mean the screen quietly showing
 * a state the fleet has already left, which is the one failure this dashboard
 * cannot have — so the pages stay fully dynamic on purpose, and `LiveRefresh`
 * states when the data was read rather than pretending it is current.
 *
 * Filter options are the exception. They are identical for every visitor and
 * every filter combination, but computing them means scanning the whole source.
 * A short in-process TTL keeps the dropdowns responsive; a minute of staleness
 * in a list of brand names costs nothing, and the counts beside them are
 * indicative anyway.
 *
 * Deliberately not `use cache`: that would require enabling Cache Components,
 * which changes rendering semantics for the entire app.
 */
const FACET_TTL_MS = 60_000;

/** Cached per scope: the computers-only dropdowns must not offer printer
 *  brands, so the two scopes are genuinely different option lists. */
const facetCache = new Map<
  DeviceScope,
  { value: Promise<Facets>; expiresAt: number }
>();

export function getFacets(scope: DeviceScope = "computers"): Promise<Facets> {
  const now = Date.now();
  const cached = facetCache.get(scope);
  if (cached && now < cached.expiresAt) return cached.value;

  const value = loadFacets(scope).catch((error: unknown) => {
    // Don't let a transient failure poison the cache for a full minute.
    facetCache.delete(scope);
    throw error;
  });
  facetCache.set(scope, { value, expiresAt: now + FACET_TTL_MS });
  return value;
}

/**
 * Options for the filter dropdowns, counted against the whole scope rather than
 * the current filters, so a value never vanishes from its own dropdown once you
 * select it.
 */
async function loadFacets(scope: DeviceScope): Promise<Facets> {
  // The same fleet the page counts, not merely the same scope — otherwise a
  // dropdown offers a model that exists only on machines the page filters out.
  const fleetWhere = ` WHERE ${fleetConditions(scope, "")
    .map((condition) => `(${condition})`)
    .join(" AND ")}`;

  const unions = DIMENSIONS.map(
    (dimension) =>
      `SELECT '${dimension}' AS dim, ${dimension} AS label, COUNT(*) AS cnt
       FROM src WHERE ${dimension} IS NOT NULL GROUP BY ${dimension}`,
  ).join("\n  UNION ALL\n  ");

  const rows = await query<{ dim: Dimension; label: string; cnt: number }>(
    `WITH src AS (SELECT * FROM (${DEVICE_SOURCE}) AS d${fleetWhere})
     ${unions}
     ORDER BY dim, cnt DESC, label ASC`,
  );

  const facets = Object.fromEntries(
    DIMENSIONS.map((dimension) => [dimension, [] as FacetValue[]]),
  ) as Facets;

  for (const row of rows) {
    facets[row.dim]?.push({ value: row.label, count: Number(row.cnt) });
  }
  return facets;
}
