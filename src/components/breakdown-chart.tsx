import Link from "next/link";

import { buildQueryString, type RawSearchParams } from "@/lib/devices/filters";
import { formatNumber } from "@/lib/devices/format";
import type { Breakdown } from "@/lib/devices/types";

/**
 * Horizontal bars for "how many of each" — the label is the entity, the length
 * is the magnitude. Deliberately a single hue: one series carries no identity
 * information, so colouring each bar differently would encode nothing while
 * spending the categorical palette. Values are labelled directly, so there is
 * no axis to read and no legend to cross-reference.
 *
 * Bars are horizontal because the labels here (department names, models) are
 * long text — vertical bars would force rotated labels.
 */
/** Matches the label `getDashboard` substitutes for a NULL dimension value. */
const UNKNOWN_LABEL = "ไม่ระบุ";

export function BreakdownChart({
  title,
  english,
  data,
  /** When set, each bar toggles that value in the dimension's filter. */
  filterKey,
  /** Current query, so a bar adds to the filters instead of replacing them. */
  params,
  emptyLabel = "ไม่มีข้อมูล",
}: {
  title: string;
  english: string;
  data: Breakdown[];
  filterKey?: string;
  params: RawSearchParams;
  emptyLabel?: string;
}) {
  const selected = filterKey
    ? [params[filterKey] ?? []].flat().flatMap((entry) => entry.split(","))
    : [];

  /** Clicking a bar narrows to it; clicking it again lets it go. Staying on
   *  this route keeps the other charts on screen to read the effect. */
  const hrefFor = (label: string) => {
    const next = selected.includes(label)
      ? selected.filter((entry) => entry !== label)
      : [...selected, label];
    return `/devices/charts${buildQueryString(params, {
      [filterKey!]: next.length ? next : null,
    })}`;
  };

  // The "ไม่ระบุ" bucket is often the largest by far — most non-PC assets carry
  // no brand, model or owner. Left in the bars it would set the scale and
  // squash every real value into a sliver, so it is pulled out and reported as
  // a footnote: still visible, no longer drowning the actual distribution.
  const unknown = data.find((entry) => entry.label === UNKNOWN_LABEL);
  const known = data.filter((entry) => entry.label !== UNKNOWN_LABEL);
  const max = Math.max(...known.map((entry) => entry.count), 1);

  return (
    // `min-w-0` keeps a long label from setting a floor on this card's width
    // and pushing the whole grid past the edge of the page.
    <section className="min-w-0 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        {title}
        <span className="ml-1.5 text-xs font-normal text-zinc-400 dark:text-zinc-500">
          {english}
        </span>
      </h2>

      {known.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">{emptyLabel}</p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {known.map((entry) => {
            const percent = (entry.count / max) * 100;
            const active = selected.includes(entry.label);
            const row = (
              <>
                <span
                  className={`w-32 shrink-0 truncate text-xs ${
                    active
                      ? "font-medium text-sky-700 dark:text-sky-300"
                      : "text-zinc-600 dark:text-zinc-400"
                  }`}
                  title={entry.label}
                >
                  {entry.label}
                </span>
                <span className="relative h-5 flex-1 rounded bg-zinc-100 dark:bg-zinc-800">
                  <span
                    className="absolute inset-y-0 left-0 rounded bg-sky-600 dark:bg-sky-500"
                    style={{ width: `${Math.max(percent, 1.5)}%` }}
                  />
                </span>
                <span className="w-12 shrink-0 text-right text-xs font-medium tabular-nums text-zinc-700 dark:text-zinc-300">
                  {formatNumber(entry.count)}
                </span>
              </>
            );

            return (
              <li key={entry.label}>
                {filterKey ? (
                  <Link
                    href={hrefFor(entry.label)}
                    aria-pressed={active}
                    className={`flex items-center gap-2 rounded px-1 py-0.5 ${
                      active
                        ? "bg-sky-50 dark:bg-sky-950/40"
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                    }`}
                  >
                    {row}
                  </Link>
                ) : (
                  <div className="flex items-center gap-2 px-1 py-0.5">{row}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {unknown ? (
        <p className="mt-3 border-t border-zinc-100 pt-2 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          ไม่ระบุ{" "}
          <span className="font-medium tabular-nums text-zinc-700 dark:text-zinc-300">
            {formatNumber(unknown.count)}
          </span>{" "}
          รายการ
          <span className="ml-1 text-zinc-400 dark:text-zinc-500">
            (ไม่นับรวมในกราฟ)
          </span>
        </p>
      ) : null}
    </section>
  );
}
