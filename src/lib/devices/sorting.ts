import type { Device } from "./types";

/**
 * The columns the device table may be ordered by.
 *
 * This list is the security boundary for `ORDER BY`: a column name cannot be
 * bound as a parameter, so it is interpolated into the statement, and the only
 * thing standing between a URL and the SQL text is that the value has to be one
 * of these literals.
 *
 * It used to live inside the query builder while `parseSort` cast whatever
 * string arrived straight to `keyof Device` — so the type claimed a guarantee
 * that was actually enforced two modules away. Keeping the list, the type and
 * the check together means the URL parser rejects an unknown column at the
 * edge, and the type it returns is true.
 */
export const SORTABLE_COLUMNS = [
  "deviceName",
  "assetNumber",
  "deviceType",
  "category",
  "brand",
  "model",
  "department",
  "location",
  "ownerName",
  "buyDate",
  "ageYears",
  "warrantyEnd",
  "warrantyDaysLeft",
  "lastSeen",
  "daysSinceSeen",
  "windowsVersion",
  "online",
] as const satisfies readonly (keyof Device)[];

export type SortableColumn = (typeof SORTABLE_COLUMNS)[number];

export function isSortable(column: string): column is SortableColumn {
  return (SORTABLE_COLUMNS as readonly string[]).includes(column);
}

export type DeviceSort = {
  column: SortableColumn;
  direction: "asc" | "desc";
};
