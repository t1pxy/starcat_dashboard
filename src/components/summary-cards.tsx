import Link from "next/link";

import { Bilingual } from "@/components/ui/typography";
import { MUTED_TEXT, TONE_SURFACE, TONE_TEXT, type Tone } from "@/components/ui/tone";
import { formatNumber } from "@/lib/devices/format";
import { EXPIRING_SOON_DAYS } from "@/lib/devices/schema";
import type { Summary } from "@/lib/devices/types";

/**
 * The six numbers worth knowing before scrolling.
 *
 * Tone is reserved for tiles that represent *work*: a coloured tile always means
 * "there is something to do here". "ออนไลน์" used to be permanently green, which
 * spent the good/warning/critical vocabulary on a number that is neither good
 * nor bad — a fleet is not healthier for having more machines switched on right
 * now — and made the three tiles that do carry work harder to pick out. It is
 * neutral now, like the total and the average age.
 */
type Tile = {
  label: string;
  english: string;
  value: string;
  hint?: string;
  tone: Tone;
  /** Tiles that name a problem link to the filtered view of that problem. */
  href?: string;
};

function KpiTile({ tile }: { tile: Tile }) {
  const body = (
    <>
      <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
        {tile.label}
        <Bilingual className="ml-1.5 text-xs">{tile.english}</Bilingual>
      </div>
      <div
        className={`mt-2 text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl ${TONE_TEXT[tile.tone]}`}
      >
        {tile.value}
      </div>
      {tile.hint ? (
        <div className={`mt-1 text-xs ${MUTED_TEXT}`}>{tile.hint}</div>
      ) : null}
    </>
  );

  const className = `rounded-xl border p-4 transition-colors ${TONE_SURFACE[tile.tone]}`;

  return tile.href ? (
    <Link
      href={tile.href}
      className={`block hover:border-zinc-400 dark:hover:border-zinc-600 ${className}`}
    >
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
      tone: "neutral",
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
      tone: summary.outdatedWindows > 0 ? "warning" : "good",
      href: "/devices?outdated=1",
    },
    {
      label: `ไม่ติดต่อตั้งแต่ ${staleDays} วัน`,
      english: "Stale agents",
      value: formatNumber(summary.staleAgents),
      hint: "เครื่องที่เงียบหายไป อัพเดทไม่ได้",
      tone: summary.staleAgents > 0 ? "warning" : "good",
      href: `/devices?stale=${staleDays}`,
    },
    {
      label: "ประกันหมดแล้ว",
      english: "Warranty expired",
      value: formatNumber(summary.warrantyExpired),
      hint: `ใกล้หมดใน ${EXPIRING_SOON_DAYS} วัน: ${formatNumber(summary.warrantyExpiring90)}`,
      tone:
        summary.warrantyExpired > 0
          ? "critical"
          : summary.warrantyExpiring90 > 0
            ? "warning"
            : "good",
      href: "/devices?warrantyWithin=0",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
      {tiles.map((tile) => (
        <KpiTile key={tile.english} tile={tile} />
      ))}
    </div>
  );
}
