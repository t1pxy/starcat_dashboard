import Link from "next/link";
import { Suspense } from "react";

import { LiveRefresh } from "@/components/live-refresh";
import { WallSkeleton } from "@/components/skeletons";
import { TONE_ON_DARK, type Tone } from "@/components/ui/tone";
import {
  countActiveFilters,
  parseFilters,
  staleThreshold,
  type RawSearchParams,
} from "@/lib/devices/filters";
import { formatDaysAgo, formatNumber, formatText } from "@/lib/devices/format";
import { getTables } from "@/lib/devices/query";
import type { Device, Summary } from "@/lib/devices/types";

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
 */

/**
 * Rows per queue. Sized so the whole screen fits a 1080p display without
 * scrolling — a wall display that has to be scrolled is showing the part nobody
 * will ever read. What does not fit is counted underneath instead.
 */
const QUEUE_ROWS = 10;

/** Matches `queueLimit` below, so a capped list can say that it is capped. */
const QUEUE_LIMIT = 200;

function Tile({
  label,
  english,
  value,
  caption,
  tone,
}: {
  label: string;
  english: string;
  value: string;
  caption?: string;
  tone: Tone;
}) {
  return (
    <div className={`rounded-2xl border p-5 ${TONE_ON_DARK[tone]}`}>
      <div className="text-base font-medium text-zinc-300">
        {label}
        <span className="ml-2 text-sm font-normal text-zinc-500">{english}</span>
      </div>
      <div className="mt-1.5 text-5xl font-semibold tabular-nums tracking-tight">
        {value}
      </div>
      {caption ? (
        <div className="mt-1.5 text-sm text-zinc-400">{caption}</div>
      ) : null}
    </div>
  );
}

/**
 * The one line somebody glancing up from their desk actually reads. Green means
 * "nothing for you"; anything else names the work rather than just colouring
 * the screen, because a red banner that does not say what is red is a fire
 * alarm with no address.
 */
function Banner({
  summary,
  staleDays,
}: {
  summary: Summary;
  staleDays: number;
}) {
  const jobs = [
    summary.staleAgents > 0
      ? `ตามหา ${formatNumber(summary.staleAgents)} เครื่อง`
      : null,
    summary.outdatedWindows > 0
      ? `อัพเดท Windows ${formatNumber(summary.outdatedWindows)} เครื่อง`
      : null,
    summary.warrantyExpired > 0
      ? `ประกันหมดแล้ว ${formatNumber(summary.warrantyExpired)} เครื่อง`
      : null,
  ].filter(Boolean);

  if (jobs.length === 0) {
    return (
      <div
        className={`rounded-2xl border px-6 py-5 text-2xl font-medium ${TONE_ON_DARK.good}`}
      >
        ทุกเครื่องปกติ — ไม่มีงานค้าง
        <span className="ml-3 text-lg font-normal text-emerald-500/80">
          All clear
        </span>
      </div>
    );
  }

  // Machines nobody can reach outrank machines that merely need patching: the
  // first is a search, the second is a scheduled job.
  const critical = summary.staleAgents > 0;

  return (
    <div
      className={`rounded-2xl border px-6 py-5 ${
        critical ? TONE_ON_DARK.critical : TONE_ON_DARK.warning
      }`}
    >
      <div className="text-2xl font-medium">มีงานค้าง {jobs.join(" · ")}</div>
      <div className="mt-1 text-base text-zinc-400">
        นับ &quot;ไม่ติดต่อ&quot; ที่ {staleDays} วันขึ้นไป
      </div>
    </div>
  );
}

function QueuePanel({
  title,
  english,
  tone,
  devices,
  emptyLabel,
  children,
}: {
  title: string;
  english: string;
  tone: Extract<Tone, "warning" | "critical">;
  devices: Device[];
  emptyLabel: string;
  children: (device: Device) => React.ReactNode;
}) {
  const accent = tone === "critical" ? "text-red-300" : "text-amber-300";
  // The query caps the list, so the count says "200+" rather than claiming the
  // cap is the answer.
  const capped = devices.length >= QUEUE_LIMIT;

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-xl font-semibold text-zinc-100">
          {title}
          <span className="ml-2 text-sm font-normal text-zinc-500">
            {english}
          </span>
        </h2>
        <span className={`text-2xl font-semibold tabular-nums ${accent}`}>
          {formatNumber(devices.length)}
          {capped ? "+" : ""}
        </span>
      </div>

      {devices.length === 0 ? (
        <p className="py-10 text-center text-lg text-emerald-400">
          {emptyLabel}
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-zinc-800">
          {devices.slice(0, QUEUE_ROWS).map((device) => (
            <li
              key={device.agentId}
              className="flex items-baseline justify-between gap-4 py-2 text-lg"
            >
              {children(device)}
            </li>
          ))}
        </ul>
      )}

      {devices.length > QUEUE_ROWS ? (
        <p className="mt-3 text-sm text-zinc-500">
          และอีก {formatNumber(devices.length - QUEUE_ROWS)}
          {capped ? "+" : ""} เครื่อง — ดูทั้งหมดในหน้าตาราง
        </p>
      ) : null}
    </section>
  );
}

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
            <span className="ml-3 text-lg font-normal text-zinc-500">
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
          caption={`ใกล้หมดใน 90 วัน: ${formatNumber(summary.warrantyExpiring90)}`}
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
