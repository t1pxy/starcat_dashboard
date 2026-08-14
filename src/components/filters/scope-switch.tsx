"use client";

import { useQueryUpdater } from "./use-query-updater";

/**
 * Which slice of the asset register the whole dashboard is reading.
 *
 * Given its own control, separated from the filters, because it is not a
 * filter: it decides what the page is *about*. Monitoring means computers and
 * laptops — the things that have an OS to patch and an agent to answer — so
 * that is the default, and widening to the full register is a deliberate act.
 */
export function ScopeSwitch() {
  const { update, searchParams } = useQueryUpdater();
  const all = searchParams.get("scope") === "all";

  const options = [
    { value: null, label: "คอม & โน้ตบุ๊ก", english: "Computers", on: !all },
    { value: "all", label: "อุปกรณ์ทั้งหมด", english: "All assets", on: all },
  ];

  return (
    <div
      role="group"
      aria-label="ขอบเขตข้อมูล"
      className="flex h-9 shrink-0 items-center rounded-lg border border-zinc-300 bg-white p-0.5 dark:border-zinc-700 dark:bg-zinc-900"
    >
      {options.map((option) => (
        <button
          key={option.english}
          type="button"
          aria-pressed={option.on}
          onClick={() => update({ scope: option.value })}
          className={`h-full rounded-md px-2.5 text-sm transition-colors ${
            option.on
              ? "bg-zinc-900 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
