import { type Tone } from "@/components/ui/tone";
import { formatNumber } from "@/lib/devices/format";
import type { Device } from "@/lib/devices/types";

/**
 * Rows per queue. Sized so the whole screen fits a 1080p display without
 * scrolling — a wall display that has to be scrolled is showing the part nobody
 * will ever read. What does not fit is counted underneath instead.
 */
const QUEUE_ROWS = 10;

/**
 * One work queue on the wall: a heading, a count, and the first few rows.
 *
 * The row itself is supplied by the caller, because the two queues answer with
 * different facts — one ends in "how long since we heard from it", the other in
 * "what version is it stuck on".
 */
export function QueuePanel({
  title,
  english,
  tone,
  devices,
  emptyLabel,
  limit,
  children,
}: {
  title: string;
  english: string;
  tone: Extract<Tone, "warning" | "critical">;
  devices: Device[];
  emptyLabel: string;
  /** Row cap applied by the query, so a truncated list can say so. */
  limit: number;
  children: (device: Device) => React.ReactNode;
}) {
  const accent = tone === "critical" ? "text-red-300" : "text-amber-300";
  // The query caps the list, so the count says "200+" rather than claiming the
  // cap is the answer.
  const capped = devices.length >= limit;

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-xl font-semibold text-zinc-100">
          {title}
          <span lang="en" className="ml-2 text-sm font-normal text-zinc-500">
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
