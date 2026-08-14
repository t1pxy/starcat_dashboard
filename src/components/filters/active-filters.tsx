"use client";

import { selectedValues, useQueryUpdater } from "./use-query-updater";
import { DIMENSIONS, DIMENSION_LABELS } from "@/lib/devices/dimensions";

/**
 * What is currently being filtered on, written out.
 *
 * The bar could only ever say *how many* filters were active — "ล้างตัวกรอง (3)"
 * — so answering "why am I only seeing eleven machines?" meant opening six
 * dropdowns one at a time to find the one still holding a value. Each active
 * value is now a chip that names itself and removes just itself, which also
 * gives the popover-free path to undoing a single choice.
 */
type Chip = {
  /** Stable key — a dimension can contribute several chips at once. */
  id: string;
  label: string;
  remove: () => void;
};

export function ActiveFilters({ defaultStaleDays }: { defaultStaleDays: number }) {
  const { update, searchParams } = useQueryUpdater();
  const chips: Chip[] = [];

  for (const dimension of DIMENSIONS) {
    const values = selectedValues(searchParams, dimension);
    for (const value of values) {
      chips.push({
        id: `${dimension}:${value}`,
        label: `${DIMENSION_LABELS[dimension].th}: ${value}`,
        remove: () => {
          const next = values.filter((entry) => entry !== value);
          update({ [dimension]: next.length ? next : null });
        },
      });
    }
  }

  const single = (key: string, label: (value: string) => string) => {
    const value = searchParams.get(key);
    if (!value) return;
    chips.push({ id: key, label: label(value), remove: () => update({ [key]: null }) });
  };

  single("q", (value) => `ค้นหา: ${value}`);
  single("online", (value) => (value === "true" ? "ออนไลน์" : "ออฟไลน์"));
  single("outdated", () => "Windows ไม่ใช่เวอร์ชันล่าสุด");
  single("warrantyWithin", (value) =>
    Number(value) <= 0 ? "ประกันหมดแล้ว" : `ประกันเหลือไม่เกิน ${value} วัน`,
  );
  single("minAge", (value) => `อายุตั้งแต่ ${value} ปี`);
  single("stale", (value) => `ไม่ติดต่อตั้งแต่ ${value} วัน`);

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-zinc-500 dark:text-zinc-400">กรองอยู่:</span>
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          onClick={chip.remove}
          className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 py-0.5 pr-1.5 pl-2.5 text-xs text-sky-900 hover:border-sky-400 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-100 dark:hover:border-sky-700"
        >
          <span className="truncate">{chip.label}</span>
          <span aria-hidden className="text-sky-600 dark:text-sky-300">
            ✕
          </span>
          <span className="sr-only">เอาตัวกรองนี้ออก</span>
        </button>
      ))}
      <button
        type="button"
        onClick={() =>
          update(
            Object.fromEntries(
              [...new Set(searchParams.keys())].map((key) => [key, null]),
            ),
          )
        }
        className="rounded-lg px-2 py-0.5 text-xs text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-400"
      >
        ล้างทั้งหมด
      </button>
      {/* The default is worth stating: without it, "no stale filter" reads as
          "no threshold" rather than "the thirty days everything else uses". */}
      {searchParams.get("stale") ? null : (
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          (นับ &quot;ไม่ติดต่อ&quot; ที่ {defaultStaleDays} วัน)
        </span>
      )}
    </div>
  );
}
