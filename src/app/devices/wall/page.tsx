import Link from "next/link";
import { Suspense } from "react";

import { LiveRefresh } from "@/components/live-refresh";
import { WallSkeleton } from "@/components/skeletons";
import { Banner } from "@/components/wall/banner";
import { QueuePanel } from "@/components/wall/queue-panel";
import { Tile } from "@/components/wall/tile";
import {
  countActiveFilters,
  parseFilters,
  staleThreshold,
  type RawSearchParams,
} from "@/lib/devices/filters";
import { formatDaysAgo, formatNumber, formatText } from "@/lib/devices/format";
import { getTables } from "@/lib/devices/query";
import { EXPIRING_SOON_DAYS } from "@/lib/devices/thresholds";

export const metadata = {
  title: "จอผนัง — Starcat Helpdesk",
  description: "สถานะอุปกรณ์แบบดูจากระยะไกล สำหรับจอที่เปิดทิ้งไว้",
};

/**
 * The screen on the wall.
 *
 * Same data as the tables view, read for a different reader: nobody is sitting
 * at this one. There is no filter bar, no sorting, no export and nothing to
 * click, because a display across the room cannot be operated — every pixel it
 * spends has to be spent on the answer to "is anything wrong, and with what".
 *
 * It commits to a dark surface rather than following the system theme. A wall
 * screen is read at a distance in a lit room, and light-on-dark is what stays
 * legible there; it also stops a bright white rectangle from being the most
 * eye-catching thing in the office.
 *
 * The filters still travel in the URL, so a team can pin their own slice of the
 * fleet — `/devices/wall?department=IT-X` — using the same links as everywhere
 * else.
 *
 * The three pieces it is built from live in `components/wall/`, like every other
 * view's components — this file is the page: fetch, arrange, and nothing else.
 */

/** Matches `queueLimit` below, so a capped list can say that it is capped. */
const QUEUE_LIMIT = 200;

async function Wall({ params }: { params: RawSearchParams }) {
  const filters = parseFilters(params);
  // `pageSize: 1` because the paged device list is the one thing this view does
  // not show; the summary and the two queues are read from the same `#dev`
  // table in the same round trip, so they cannot disagree with each other.
  const data = await getTables(filters, {
    pageSize: 1,
    queueLimit: QUEUE_LIMIT,
  });
  const fetchedAt = new Date().toISOString();

  const { summary, outdated, stale } = data;
  const staleDays = staleThreshold(filters);
  const activeFilters = countActiveFilters(filters);
  const onlineShare = summary.total
    ? Math.round((summary.online / summary.total) * 100)
    : 0;

  return (
    <main className="flex min-h-screen flex-col gap-4 bg-zinc-950 p-6 text-zinc-100">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">
            สถานะอุปกรณ์
            <span lang="en" className="ml-3 text-lg font-normal text-zinc-500">
              Starcat Helpdesk — Fleet status
            </span>
          </h1>
          <p className="mt-1 text-base text-zinc-400">
            {filters.scope === "all" ? "อุปกรณ์ทั้งหมด" : "คอมพิวเตอร์และโน้ตบุ๊ก"}
            {/* A wall screen showing a filtered fleet has to say so, or it
                quietly under-reports the thing it exists to report. */}
            {activeFilters > 0 ? ` · กรองอยู่ ${activeFilters} เงื่อนไข` : ""}
          </p>
        </div>

        <div className="flex items-center gap-4 text-zinc-400">
          <LiveRefresh fetchedAt={fetchedAt} size="large" />
          <Link
            href="/devices"
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:border-zinc-500"
          >
            กลับหน้าตาราง
          </Link>
        </div>
      </header>

      <Banner summary={summary} staleDays={staleDays} />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Tile
          label="ออนไลน์"
          english="Online"
          value={`${formatNumber(summary.online)}`}
          caption={`จาก ${formatNumber(summary.total)} เครื่อง (${onlineShare}%) · ออฟไลน์ ${formatNumber(summary.offline)}`}
          tone="neutral"
        />
        <Tile
          label={`ไม่ติดต่อตั้งแต่ ${staleDays} วัน`}
          english="Out of contact"
          value={formatNumber(summary.staleAgents)}
          caption="ต้องตามหาก่อนถึงจะอัพเดทได้"
          tone={summary.staleAgents > 0 ? "critical" : "good"}
        />
        <Tile
          label="Windows ไม่ใช่เวอร์ชันล่าสุด"
          english="Outdated Windows"
          value={formatNumber(summary.outdatedWindows)}
          caption={
            summary.newestWindowsVersion
              ? `ล่าสุดในองค์กรคือ ${summary.newestWindowsVersion}`
              : undefined
          }
          tone={summary.outdatedWindows > 0 ? "warning" : "good"}
        />
        <Tile
          label="ประกันหมดแล้ว"
          english="Warranty expired"
          value={formatNumber(summary.warrantyExpired)}
          caption={`ใกล้หมดใน ${EXPIRING_SOON_DAYS} วัน: ${formatNumber(summary.warrantyExpiring90)}`}
          tone={
            summary.warrantyExpired > 0
              ? "critical"
              : summary.warrantyExpiring90 > 0
                ? "warning"
                : "good"
          }
        />
      </div>

      <div className="grid flex-1 gap-4 xl:grid-cols-2">
        <QueuePanel
          title="ต้องตามหา"
          english="Out of contact"
          tone="critical"
          devices={stale}
          emptyLabel="ทุกเครื่องติดต่อเข้ามาตามปกติ 🎉"
          limit={QUEUE_LIMIT}
        >
          {(device) => (
            <>
              <span className="font-medium">
                {formatText(device.deviceName)}
                <span className="ml-2 text-base font-normal text-zinc-400">
                  {formatText(device.ownerName)} · {formatText(device.department)}
                </span>
              </span>
              <span className="shrink-0 tabular-nums text-red-300">
                {formatDaysAgo(device.daysSinceSeen)}
              </span>
            </>
          )}
        </QueuePanel>

        <QueuePanel
          title="ต้องอัพเดท Windows"
          english="Needs update"
          tone="warning"
          devices={outdated}
          emptyLabel="ทุกเครื่องที่ติดต่อได้เป็นเวอร์ชันล่าสุดแล้ว 🎉"
          limit={QUEUE_LIMIT}
        >
          {(device) => (
            <>
              <span className="font-medium">
                {formatText(device.deviceName)}
                <span className="ml-2 text-base font-normal text-zinc-400">
                  {formatText(device.ownerName)} · {formatText(device.department)}
                </span>
              </span>
              <span className="shrink-0 tabular-nums text-amber-300">
                {formatText(device.windowsVersion)}
              </span>
            </>
          )}
        </QueuePanel>
      </div>
    </main>
  );
}

export default async function WallPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const params = await searchParams;

  return (
    <Suspense fallback={<WallSkeleton />}>
      <Wall params={params} />
    </Suspense>
  );
}
