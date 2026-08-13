import Link from "next/link";

import { formatNumber } from "@/lib/devices/format";
import { EXPIRING_SOON_DAYS } from "@/lib/devices/schema";
import type { Summary } from "@/lib/devices/types";

/**
 * Tone is reserved for state, not decoration: `warn`/`bad` only ever mark a
 * count that represents work to be done, so a coloured tile always means
 * "look here".
 */
type Tone = "neutral" | "good" | "warn" | "bad";

const TONE_CLASSES: Record<Tone, string> = {
  neutral:
    "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900",
  good: "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/60 dark:bg-emerald-950/30",
  warn: "border-amber-200 bg-amber-50/60 dark:border-amber-900/60 dark:bg-amber-950/30",
  bad: "border-red-200 bg-red-50/60 dark:border-red-900/60 dark:bg-red-950/30",
};

const VALUE_CLASSES: Record<Tone, string> = {
  neutral: "text-zinc-900 dark:text-zinc-50",
  good: "text-emerald-700 dark:text-emerald-300",
  warn: "text-amber-700 dark:text-amber-300",
  bad: "text-red-700 dark:text-red-300",
};

type Tile = {
  label: string;
  english: string;
  value: string;
  hint?: string;
  tone: Tone;
  /** Tiles that name a problem link to the filtered view of that problem. */
  href?: string;
};

function Card({ tile }: { tile: Tile }) {
  const body = (
    <>
      <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
        {tile.label}
        <span className="ml-1.5 text-xs font-normal text-zinc-400 dark:text-zinc-500">
          {tile.english}
        </span>
      </div>
      <div
        className={`mt-2 text-3xl font-semibold tabular-nums tracking-tight ${VALUE_CLASSES[tile.tone]}`}
      >
        {tile.value}
      </div>
      {tile.hint ? (
        <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          {tile.hint}
        </div>
      ) : null}
    </>
  );

  const className = `rounded-xl border p-4 transition-colors ${TONE_CLASSES[tile.tone]} ${
    tile.href ? "hover:border-zinc-400 dark:hover:border-zinc-600" : ""
  }`;

  return tile.href ? (
    <Link href={tile.href} className={`block ${className}`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

export function SummaryCards({
  summary,
  staleDays,
}: {
  summary: Summary;
  /** The silence threshold currently in force — the tile is labelled and links
   *  with the reader's own number, not a fixed 30. */
  staleDays: number;
}) {
  const tiles: Tile[] = [
    {
      label: "อุปกรณ์ทั้งหมด",
      english: "Total",
      value: formatNumber(summary.total),
      // "อื่นๆ 0" is dead text under the computers-only default, so the hint
      // states the scope instead of a count that can never be anything but zero.
      hint:
        summary.equipment === 0
          ? "เฉพาะคอมพิวเตอร์และโน้ตบุ๊ก"
          : `คอมพิวเตอร์ ${formatNumber(summary.computers)} · อื่นๆ ${formatNumber(summary.equipment)}`,
      tone: "neutral",
    },
    {
      label: "ออนไลน์",
      english: "Online",
      value: formatNumber(summary.online),
      hint: `ออฟไลน์ ${formatNumber(summary.offline)}`,
      tone: "good",
      href: "/devices?online=true",
    },
    {
      label: "อายุเฉลี่ย",
      english: "Avg. age",
      value: summary.averageAgeYears === null ? "—" : `${summary.averageAgeYears} ปี`,
      hint: "นับจากวันที่ซื้อ",
      tone: "neutral",
    },
    {
      label: "Windows ไม่ใช่เวอร์ชันล่าสุด",
      english: "Outdated Windows",
      value: formatNumber(summary.outdatedWindows),
      hint: summary.newestWindowsVersion
        ? `ล่าสุดในองค์กรคือ ${summary.newestWindowsVersion}`
        : undefined,
      tone: summary.outdatedWindows > 0 ? "warn" : "good",
      href: "/devices?outdated=1",
    },
    {
      label: `ไม่ติดต่อตั้งแต่ ${staleDays} วัน`,
      english: "Stale agents",
      value: formatNumber(summary.staleAgents),
      hint: "เครื่องที่เงียบหายไป อัพเดทไม่ได้",
      tone: summary.staleAgents > 0 ? "warn" : "good",
      href: `/devices?stale=${staleDays}`,
    },
    {
      label: "ประกันหมดแล้ว",
      english: "Warranty expired",
      value: formatNumber(summary.warrantyExpired),
      hint: `ใกล้หมดใน ${EXPIRING_SOON_DAYS} วัน: ${formatNumber(summary.warrantyExpiring90)}`,
      tone:
        summary.warrantyExpired > 0
          ? "bad"
          : summary.warrantyExpiring90 > 0
            ? "warn"
            : "good",
      href: "/devices?warrantyWithin=0",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
      {tiles.map((tile) => (
        <Card key={tile.english} tile={tile} />
      ))}
    </div>
  );
}
