/**
 * Device names are not arbitrary — they encode four facts that exist nowhere
 * else in the Starcat database, in fixed positions:
 *
 *     2 5 P D T 0 0 1
 *     ─┬─ ┬ ─┬─ ──┬──
 *      │  │  │    └── running number within that year/type
 *      │  │  └─────── form factor: DT = ตั้งโต๊ะ, NB = โน้ตบุ๊ก
 *      │  └────────── ownership:  P = ซื้อ,      R = เช่า
 *      └───────────── คริสต์ศักราช year, last two digits (25 → 2025)
 *
 * Whether a machine is bought or leased decides who pays to replace it, so it
 * is worth surfacing rather than leaving encoded in a string nobody parses.
 *
 * Names that do not match the scheme (older or hand-entered ones) return
 * `null` and are simply shown as-is; guessing at a partial match would invent
 * facts about the asset.
 */
export type DeviceNameParts = {
  /** Full Christian-era year, e.g. 2025. */
  year: number;
  ownership: "owned" | "leased";
  formFactor: "desktop" | "laptop";
  runningNumber: string;
};

const PATTERN = /^(\d{2})([PR])(DT|NB)(\d+)$/i;

export function parseDeviceName(
  name: string | null | undefined,
): DeviceNameParts | null {
  const match = name?.trim().toUpperCase().match(PATTERN);
  if (!match) return null;

  const [, year, ownership, formFactor, runningNumber] = match;

  return {
    // Two digits are unambiguous in practice: the fleet is nowhere near a
    // century old, so 25 can only mean 2025.
    year: 2000 + Number(year),
    ownership: ownership === "P" ? "owned" : "leased",
    formFactor: formFactor === "DT" ? "desktop" : "laptop",
    runningNumber,
  };
}

export const OWNERSHIP_LABELS = {
  owned: { th: "ซื้อ", en: "Purchased" },
  leased: { th: "เช่า", en: "Leased" },
} as const;

export const FORM_FACTOR_LABELS = {
  desktop: { th: "ตั้งโต๊ะ", en: "Desktop" },
  laptop: { th: "โน้ตบุ๊ก", en: "Laptop" },
} as const;

/** "ปี 2025 · ซื้อ · ตั้งโต๊ะ" — the decoded name, for a caption line. */
export function describeDeviceName(parts: DeviceNameParts): string {
  return [
    `ปี ${parts.year}`,
    OWNERSHIP_LABELS[parts.ownership].th,
    FORM_FACTOR_LABELS[parts.formFactor].th,
  ].join(" · ");
}
