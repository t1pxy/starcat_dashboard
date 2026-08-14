import Link from "next/link";

import { ExportButton } from "@/components/export-button";
import { LiveRefresh } from "@/components/live-refresh";
import { MUTED_TEXT } from "@/components/ui/tone";
import { Bilingual, PageTitle } from "@/components/ui/typography";
import { buildQueryString, type RawSearchParams } from "@/lib/devices/filters";

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
  fetchedAt,
}: {
  active: DashboardView;
  params: RawSearchParams;
  /** Row count behind the export link, so the button says what it will produce. */
  total: number;
  /** When the data on screen was read, for the freshness line. */
  fetchedAt: string;
}) {
  // Sorting and paging belong to the table view; carrying them onto the charts
  // tab and back again would be noise in the URL.
  const query = buildQueryString(params, { sort: null, dir: null, page: null });

  return (
    <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
      <div className="min-w-0">
        <PageTitle
          title="Dashboard อุปกรณ์"
          english="Starcat Helpdesk — Device Dashboard"
        />
        <div
          className={`mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs ${MUTED_TEXT}`}
        >
          <LiveRefresh fetchedAt={fetchedAt} />
          <span>ตัวกรองมีผลกับทุกหน้า ทั้งกราฟ ตาราง และไฟล์ Excel</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* The wall view carries the filters across too, so a team can put
            "their" slice of the fleet on the screen behind them. */}
        <Link
          href={`/devices/wall${query}`}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-300 px-3 text-sm text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500"
        >
          <span aria-hidden>◱</span>
          จอผนัง
          <Bilingual className="text-xs">Wall</Bilingual>
        </Link>

        <ExportButton
          href={`/api/devices/export${buildQueryString(params, { page: null })}`}
          total={total}
        />
      </div>

      {/*
        The view switcher sits on its own row below the title so it keeps a full
        line to itself on narrow screens instead of competing with the two
        buttons for the same one.
      */}
      <nav aria-label="มุมมอง" className="flex w-full gap-1">
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
              <Bilingual
                className={`ml-1.5 text-xs ${
                  current ? "text-zinc-400 dark:text-zinc-500" : ""
                }`}
              >
                {view.english}
              </Bilingual>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
