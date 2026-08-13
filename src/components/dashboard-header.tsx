import Link from "next/link";

import { buildQueryString, type RawSearchParams } from "@/lib/devices/filters";
import { formatNumber } from "@/lib/devices/format";

/**
 * Title, view switcher and export button, shared by both routes.
 *
 * The tabs carry the current query string across, so switching between the
 * tables and the charts never drops the filters you set up — the two views are
 * two readings of the same filtered set, not two separate reports.
 */
export type DashboardView = "tables" | "charts";

const VIEWS: {
  id: DashboardView;
  href: string;
  label: string;
  english: string;
}[] = [
  { id: "tables", href: "/devices", label: "ตาราง", english: "Tables" },
  { id: "charts", href: "/devices/charts", label: "กราฟ", english: "Charts" },
];

export function DashboardHeader({
  active,
  params,
  total,
}: {
  active: DashboardView;
  params: RawSearchParams;
  /** Row count behind the export link, so the button says what it will produce. */
  total: number;
}) {
  // Sorting and paging belong to the table view; carrying them onto the charts
  // tab and back again would be noise in the URL.
  const query = buildQueryString(params, { sort: null, dir: null, page: null });

  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Dashboard อุปกรณ์
          <span className="ml-2 text-sm font-normal text-zinc-400 dark:text-zinc-500">
            Starcat Helpdesk — Device Dashboard
          </span>
        </h1>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          ข้อมูลสดจากฐานข้อมูล MSSQL · ตัวกรองมีผลกับทุกหน้า ทั้งกราฟ ตาราง และไฟล์ Excel
        </p>

        <nav aria-label="มุมมอง" className="mt-3 flex gap-1">
          {VIEWS.map((view) => {
            const current = view.id === active;
            return (
              <Link
                key={view.id}
                href={`${view.href}${query}`}
                aria-current={current ? "page" : undefined}
                className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  current
                    ? "bg-zinc-900 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "text-zinc-600 hover:bg-zinc-200/70 dark:text-zinc-400 dark:hover:bg-zinc-800"
                }`}
              >
                {view.label}
                <span
                  className={`ml-1.5 text-xs font-normal ${
                    current
                      ? "text-zinc-400 dark:text-zinc-500"
                      : "text-zinc-400 dark:text-zinc-600"
                  }`}
                >
                  {view.english}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      <a
        href={`/api/devices/export${buildQueryString(params, { page: null })}`}
        className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700"
      >
        <span aria-hidden>⤓</span>
        Export Excel
        <span className="text-emerald-200">({formatNumber(total)})</span>
      </a>
    </div>
  );
}
