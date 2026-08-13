import { formatNumber } from "@/lib/devices/format";
import type { FleetComposition } from "@/lib/devices/types";

/**
 * What the device-name scheme reveals: `25PDT001` is a desktop bought in 2025.
 *
 * These three views answer budget questions the database cannot otherwise
 * answer — how much of the estate is leased rather than owned, how it splits
 * between desks and bags, and how many machines arrived each year (which is
 * also, seven years later, the replacement schedule).
 *
 * Colour here is *identity*, not state, so it deliberately does not use the
 * status palette — nothing on these charts is good or bad. Two categorical
 * hues carry the split, with a legend and direct labels beside every bar.
 */
const OWNED = "var(--series-1)";
const LEASED = "var(--series-2)";

export function CompositionCharts({
  composition,
}: {
  composition: FleetComposition;
}) {
  const { ownership, formFactor, byYear, undecoded } = composition;
  const decoded = ownership.owned + ownership.leased;

  if (decoded === 0) {
    return (
      <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <Heading />
        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
          ไม่มีเครื่องที่ชื่อตรงรูปแบบ (ปี ค.ศ. 2 หลัก + P/R + DT/NB) ในผลลัพธ์นี้
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <Heading />
        <Legend />
      </div>

      <div className="mt-4 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <Split
          title="การจัดหา"
          english="Ownership"
          rows={[
            { label: "ซื้อ (P)", count: ownership.owned, color: OWNED },
            { label: "เช่า (R)", count: ownership.leased, color: LEASED },
          ]}
        />
        <Split
          title="ชนิดเครื่อง"
          english="Form factor"
          rows={[
            {
              label: "ตั้งโต๊ะ (DT)",
              count: formFactor.desktop,
              color: OWNED,
            },
            { label: "โน้ตบุ๊ก (NB)", count: formFactor.laptop, color: LEASED },
          ]}
        />
        <ByYear rows={byYear} />
      </div>

      {undecoded > 0 ? (
        <p className="mt-4 border-t border-zinc-100 pt-2 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          อีก{" "}
          <span className="font-medium tabular-nums text-zinc-700 dark:text-zinc-300">
            {formatNumber(undecoded)}
          </span>{" "}
          รายการ ชื่อไม่ตรงรูปแบบนี้ จึงไม่ได้นับรวม — อาจเป็นเครื่องเก่าหรือตั้งชื่อเอง
        </p>
      ) : null}
    </section>
  );
}

function Heading() {
  return (
    <div>
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        องค์ประกอบของเครื่อง (จากชื่อเครื่อง)
        <span className="ml-1.5 text-xs font-normal text-zinc-400 dark:text-zinc-500">
          Fleet composition
        </span>
      </h2>
      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
        อ่านจากรูปแบบชื่อ เช่น <span className="font-mono">25PDT001</span> = ปี 2025 (ค.ศ.) ·
        ซื้อ · ตั้งโต๊ะ
      </p>
    </div>
  );
}

function Legend() {
  return (
    <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
      {[
        { label: "ซื้อ / ตั้งโต๊ะ", color: OWNED },
        { label: "เช่า / โน้ตบุ๊ก", color: LEASED },
      ].map((entry) => (
        <li key={entry.label} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="size-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          {entry.label}
        </li>
      ))}
    </ul>
  );
}

function Split({
  title,
  english,
  rows,
}: {
  title: string;
  english: string;
  rows: { label: string; count: number; color: string }[];
}) {
  const total = rows.reduce((sum, row) => sum + row.count, 0);

  return (
    <div className="min-w-0">
      <h3 className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
        {title}
        <span className="ml-1.5 font-normal text-zinc-400 dark:text-zinc-500">
          {english}
        </span>
      </h3>

      <div className="mt-2 flex h-6 gap-0.5 overflow-hidden rounded">
        {rows
          .filter((row) => row.count > 0)
          .map((row) => (
            <div
              key={row.label}
              title={`${row.label}: ${formatNumber(row.count)} เครื่อง`}
              style={{
                width: `${(row.count / total) * 100}%`,
                backgroundColor: row.color,
              }}
              className="first:rounded-l last:rounded-r"
            />
          ))}
      </div>

      <ul className="mt-2 space-y-1">
        {rows.map((row) => (
          <li key={row.label} className="flex items-baseline gap-2 text-xs">
            <span
              aria-hidden
              className="size-2 shrink-0 translate-y-px rounded-full"
              style={{ backgroundColor: row.color }}
            />
            <span className="flex-1 text-zinc-600 dark:text-zinc-400">
              {row.label}
            </span>
            <span className="font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
              {formatNumber(row.count)}
            </span>
            <span className="w-11 shrink-0 text-right tabular-nums text-zinc-400 dark:text-zinc-500">
              {((row.count / total) * 100).toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Arrivals per year, which read backwards are the replacement schedule. */
function ByYear({ rows }: { rows: FleetComposition["byYear"] }) {
  const max = Math.max(...rows.map((row) => row.owned + row.leased), 1);

  return (
    <div className="min-w-0">
      <h3 className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
        ปีที่ได้มา
        <span className="ml-1.5 font-normal text-zinc-400 dark:text-zinc-500">
          By year (ค.ศ.)
        </span>
      </h3>

      <ul className="mt-2 space-y-1">
        {rows.map((row) => {
          const total = row.owned + row.leased;
          return (
            <li key={row.year} className="flex items-center gap-2 text-xs">
              <span className="w-9 shrink-0 tabular-nums text-zinc-600 dark:text-zinc-400">
                {row.year}
              </span>
              <span className="flex h-4 min-w-0 flex-1 gap-0.5">
                <span
                  className="flex gap-0.5 overflow-hidden rounded"
                  style={{ width: `${Math.max((total / max) * 100, 2)}%` }}
                  title={`${row.year}: ซื้อ ${formatNumber(row.owned)} · เช่า ${formatNumber(row.leased)}`}
                >
                  {row.owned > 0 ? (
                    <span
                      style={{
                        width: `${(row.owned / total) * 100}%`,
                        backgroundColor: OWNED,
                      }}
                      className="first:rounded-l last:rounded-r"
                    />
                  ) : null}
                  {row.leased > 0 ? (
                    <span
                      style={{
                        width: `${(row.leased / total) * 100}%`,
                        backgroundColor: LEASED,
                      }}
                      className="first:rounded-l last:rounded-r"
                    />
                  ) : null}
                </span>
              </span>
              <span className="w-10 shrink-0 text-right font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
                {formatNumber(total)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
