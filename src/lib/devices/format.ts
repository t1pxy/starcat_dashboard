/**
 * Display helpers. Dates render in Thai with **คริสต์ศักราช** years throughout.
 *
 * The `-u-ca-gregory` extension is load-bearing: a bare `th-TH` locale defaults
 * to the Buddhist calendar and would silently print every year 543 higher. The
 * device names encode a Christian-era year and the Excel export writes real
 * `Date` values, so this keeps all three readings of a year in agreement — a
 * table mixing eras is what makes a 543-year misreading possible.
 */
const THAI_GREGORIAN = "th-TH-u-ca-gregory";

const DATE_FORMAT = new Intl.DateTimeFormat(THAI_GREGORIAN, {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const DATETIME_FORMAT = new Intl.DateTimeFormat(THAI_GREGORIAN, {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const NUMBER_FORMAT = new Intl.NumberFormat("th-TH");

export const EM_DASH = "—";

export function formatDate(value: string | null | undefined): string {
  if (!value) return EM_DASH;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? EM_DASH : DATE_FORMAT.format(date);
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return EM_DASH;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? EM_DASH : DATETIME_FORMAT.format(date);
}

export function formatNumber(value: number | null | undefined): string {
  return value === null || value === undefined ? EM_DASH : NUMBER_FORMAT.format(value);
}

export function formatText(value: string | null | undefined): string {
  return value?.trim() ? value : EM_DASH;
}

export function formatYears(value: number | null | undefined): string {
  return value === null || value === undefined ? EM_DASH : `${value} ปี`;
}

export function formatGb(value: number | null | undefined): string {
  return value === null || value === undefined ? EM_DASH : `${value} GB`;
}

/** "ไม่เคยติดต่อ" / "วันนี้" / "5 วันที่แล้ว" */
export function formatDaysAgo(days: number | null | undefined): string {
  if (days === null || days === undefined) return "ไม่เคยติดต่อ";
  if (days <= 0) return "วันนี้";
  if (days === 1) return "เมื่อวาน";
  return `${formatNumber(days)} วันที่แล้ว`;
}

/**
 * How long a machine has been unreachable, counted from its last sign of life.
 *
 * Days alone are too coarse here: most offline PCs at any moment are simply
 * switched off for the night, so a day count rounds nearly all of them to
 * "0 วัน" and the handful that have been gone a fortnight look identical to
 * the one that went home an hour ago. Hours below a day, days above it.
 *
 * There is no "went offline at" column in Starcat — `lastSeen` is the most
 * recent ping or inventory sweep, which for an offline machine is exactly when
 * it was last reachable.
 */
export function formatOfflineFor(
  lastSeen: string | null | undefined,
): string | null {
  if (!lastSeen) return "ไม่เคยติดต่อ";

  const seen = new Date(lastSeen);
  if (Number.isNaN(seen.getTime())) return null;

  const minutes = Math.floor((Date.now() - seen.getTime()) / 60_000);
  // A clock skew between the database server and this one can put "last seen"
  // slightly in the future; report that as just-now rather than as a negative.
  if (minutes < 60) return "ไม่ถึง 1 ชม.";
  if (minutes < 1440) return `${Math.floor(minutes / 60)} ชม.`;
  return `${formatNumber(Math.floor(minutes / 1440))} วัน`;
}

/** "เหลือ 42 วัน" / "หมดแล้ว 8 วัน" */
export function formatWarrantyDays(days: number | null | undefined): string {
  if (days === null || days === undefined) return EM_DASH;
  if (days < 0) return `หมดแล้ว ${formatNumber(Math.abs(days))} วัน`;
  if (days === 0) return "หมดวันนี้";
  return `เหลือ ${formatNumber(days)} วัน`;
}
