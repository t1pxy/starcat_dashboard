import { formatNumber } from "@/lib/devices/format";
import { STATUS_COLOR, type StatusTone } from "@/lib/devices/status";

export type Segment = {
  label: string;
  count: number;
  tone: StatusTone;
};

/**
 * A part-to-whole bar: one row of the fleet, split by state.
 *
 * Horizontal because the labels are long Thai phrases, and stacked rather than
 * side-by-side because the reader's question is "what share of my machines is
 * in trouble", which is a proportion, not four separate magnitudes.
 *
 * Every segment is also written out underneath with its count and share, so the
 * chart never depends on colour alone — which matters here because the amber
 * step sits below 3:1 against the white surface by design.
 */
export function StatusBar({
  title,
  english,
  segments,
  footnote,
  /** Rendered when nothing matches the current filters. */
  emptyLabel = "ไม่มีข้อมูล",
}: {
  title: string;
  english: string;
  segments: Segment[];
  footnote?: string | null;
  emptyLabel?: string;
}) {
  const total = segments.reduce((sum, segment) => sum + segment.count, 0);
  const shown = segments.filter((segment) => segment.count > 0);

  return (
    // `min-w-0` is load-bearing: a grid item defaults to min-width:auto, so
    // without it the longest label sets a floor on the card's width and the
    // whole row of cards pushes the page into a horizontal scroll.
    <section className="min-w-0 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        {title}
        <span className="ml-1.5 text-xs font-normal text-zinc-400 dark:text-zinc-500">
          {english}
        </span>
      </h3>

      {total === 0 ? (
        <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">
          {emptyLabel}
        </p>
      ) : (
        <>
          {/* gap-0.5 is the 2px surface gap that keeps adjacent fills apart. */}
          <div className="mt-3 flex h-6 gap-0.5 overflow-hidden rounded">
            {shown.map((segment) => (
              <div
                key={segment.label}
                title={`${segment.label}: ${formatNumber(segment.count)} เครื่อง`}
                style={{
                  width: `${(segment.count / total) * 100}%`,
                  backgroundColor: STATUS_COLOR[segment.tone],
                }}
                className="first:rounded-l last:rounded-r"
              />
            ))}
          </div>

          <ul className="mt-3 space-y-1.5">
            {segments.map((segment) => (
              <li
                key={segment.label}
                className="flex items-baseline gap-2 text-xs"
              >
                <span
                  aria-hidden
                  className="size-2 shrink-0 translate-y-px rounded-full"
                  style={{ backgroundColor: STATUS_COLOR[segment.tone] }}
                />
                <span className="min-w-0 flex-1 break-words text-zinc-600 dark:text-zinc-400">
                  {segment.label}
                </span>
                <span className="font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
                  {formatNumber(segment.count)}
                </span>
                <span className="w-11 shrink-0 text-right tabular-nums text-zinc-400 dark:text-zinc-500">
                  {((segment.count / total) * 100).toFixed(1)}%
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {footnote ? (
        <p className="mt-3 border-t border-zinc-100 pt-2 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          {footnote}
        </p>
      ) : null}
    </section>
  );
}
