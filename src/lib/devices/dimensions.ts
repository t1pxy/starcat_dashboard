/**
 * The seven dimensions the dashboard groups, filters and charts by.
 *
 * This list used to be written out six times — as `DIMENSIONS` in the SQL
 * layer, as `MULTI_KEYS` in the URL parser, as the seven keys of `Facets`, as
 * seven optional fields on `DeviceFilters`, as seven `<MultiSelect>` elements in
 * the filter bar, and once more as the chip labels — with nothing tying the
 * copies together.
 *
 * Adding an eighth dimension therefore meant editing six places, and forgetting
 * the URL parser in particular would have produced the worst kind of bug: a
 * filter that renders, accepts clicks and writes itself into the query string,
 * which the server then silently ignores. Nothing would have failed loudly.
 *
 * Deliberately free of SQL and of `import "server-only"`, because both halves of
 * the app need it: the query builder interpolates these strings as column names,
 * and the filter bar reads the same strings in the browser as URL parameter
 * names. That the column name, the URL key and the `Device` field name are all
 * one string is what lets a single list serve all three.
 */
export const DIMENSIONS = [
  "deviceType",
  "category",
  "brand",
  "model",
  "department",
  "location",
  "windowsVersion",
] as const;

export type Dimension = (typeof DIMENSIONS)[number];

/**
 * What each dimension is called on screen — bilingual, like every other label
 * in the dashboard: Thai for the reader, and the English field name the
 * helpdesk team uses when talking about the underlying database.
 */
export const DIMENSION_LABELS: Record<Dimension, { th: string; en: string }> = {
  deviceType: { th: "ประเภท", en: "Type" },
  category: { th: "หมวดหมู่", en: "Category" },
  brand: { th: "ยี่ห้อ", en: "Brand" },
  model: { th: "รุ่น", en: "Model" },
  department: { th: "หน่วยงาน", en: "Department" },
  location: { th: "สถานที่", en: "Location" },
  windowsVersion: { th: "Windows", en: "Windows Version" },
};
