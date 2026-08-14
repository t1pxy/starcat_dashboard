import {
  AGE_ANCIENT_YEARS,
  AGE_OLD_YEARS,
  CONTACT_OK_DAYS,
  EXPIRING_SOON_DAYS,
} from "./thresholds";
import type { BucketCounts } from "./types";

/**
 * The vocabulary every chart on the dashboard shares.
 *
 * Four tones, reserved for *state* and never reused to tell two series apart,
 * so a colour means the same thing wherever it appears: green is fine, amber is
 * work you should schedule, red is work that is already overdue, grey is "we do
 * not know". Every segment also carries a written label, because on a white
 * surface amber sits below the 3:1 contrast line — colour is never the only
 * thing carrying the meaning.
 *
 * Related but deliberately not the same as `Tone` in `components/ui/tone.ts`,
 * and the difference is the fourth member:
 *
 *   StatusTone."none"    — a chart segment for rows whose state is *unknown*
 *                          (no purchase date, no agent reporting).
 *   Tone."neutral"       — a card or number that carries no judgement at all.
 *
 * They also serve different mediums: these are raw CSS variables filling chart
 * geometry, `Tone` is Tailwind class strings with light/dark pairs for component
 * surfaces. A chart cannot use a class string and a card cannot fill an SVG, so
 * merging them would mean one of the two constantly converting to the other.
 */
export type StatusTone = "good" | "warning" | "critical" | "none";

export const STATUS_COLOR: Record<StatusTone, string> = {
  good: "var(--status-good)",
  warning: "var(--status-warning)",
  critical: "var(--status-critical)",
  none: "var(--status-none)",
};

export type Bucket = {
  /** Bucket id as produced by the SQL CASE expression. */
  id: string;
  label: string;
  tone: StatusTone;
  /** Extra ids folded into this segment, counted but not drawn separately. */
  merges?: string[];
};

export type DistributionSpec = {
  key: "contact" | "warranty" | "windows" | "age";
  title: string;
  english: string;
  buckets: Bucket[];
  /** Optional footnote drawn from bucket counts the segments do not name. */
  footnote?: (counts: BucketCounts) => string | null;
};

/**
 * The four questions worth asking about a fleet at a glance: can I reach it, is
 * it still covered, is it patched, and how old is it.
 *
 * Takes the silence threshold rather than reading the constant, because the
 * reader sets it (`?stale=N`) and the chart has to be labelled with the number
 * it was actually cut at — a bar drawn at 90 days under a legend that says 30
 * is worse than no bar at all.
 */
export function distributionsFor(staleDays: number): DistributionSpec[] {
  return [
    {
      key: "contact",
      title: "สถานะการติดต่อ",
      english: "Contact status",
      buckets: [
        {
          id: "ok",
          label: `ปกติ (ไม่เกิน ${CONTACT_OK_DAYS} วัน)`,
          tone: "good",
        },
        {
          id: "slow",
          // Below about a week the middle band has no room left to describe, so
          // it is named rather than given a range that would read "8–4 วัน".
          label:
            staleDays > CONTACT_OK_DAYS + 1
              ? `เริ่มเงียบ (${CONTACT_OK_DAYS + 1}–${staleDays - 1} วัน)`
              : "เริ่มเงียบ",
          tone: "warning",
        },
        // "Never reported" and "went quiet" are both simply unreachable, so they
        // share a segment rather than spending a fifth colour; the count that got
        // folded in is spelled out underneath instead of being lost.
        {
          id: "lost",
          label: `ขาดการติดต่อ (${staleDays} วันขึ้นไป)`,
          tone: "critical",
          merges: ["never"],
        },
      ],
      footnote: (counts) =>
        counts.never
          ? `ในจำนวนนี้ ไม่เคยติดต่อเข้ามาเลย ${counts.never} เครื่อง`
          : null,
    },
    {
      key: "warranty",
      title: "สถานะประกัน",
      english: "Warranty status",
      buckets: [
        { id: "ok", label: "ยังอยู่ในประกัน", tone: "good" },
        {
          id: "soon",
          label: `ใกล้หมด (ไม่เกิน ${EXPIRING_SOON_DAYS} วัน)`,
          tone: "warning",
        },
        { id: "expired", label: "หมดประกันแล้ว", tone: "critical" },
        { id: "unknown", label: "ไม่ระบุ", tone: "none" },
      ],
    },
    {
      key: "windows",
      title: "ความเป็นปัจจุบันของ Windows",
      english: "Windows currency",
      buckets: [
        { id: "current", label: "เวอร์ชันล่าสุด", tone: "good" },
        { id: "behind", label: "ตามหลังเวอร์ชันล่าสุด", tone: "warning" },
        { id: "unknown", label: "ไม่มีข้อมูล (ไม่ใช่เครื่องที่มี Agent)", tone: "none" },
      ],
    },
    {
      key: "age",
      title: "อายุเครื่อง",
      english: "Device age",
      buckets: [
        { id: "new", label: `ไม่เกิน ${AGE_OLD_YEARS} ปี`, tone: "good" },
        {
          id: "old",
          label: `${AGE_OLD_YEARS}–${AGE_ANCIENT_YEARS} ปี`,
          tone: "warning",
        },
        {
          id: "ancient",
          label: `เกิน ${AGE_ANCIENT_YEARS} ปี — ควรพิจารณาเปลี่ยน`,
          tone: "critical",
        },
        { id: "unknown", label: "ไม่ทราบวันที่ซื้อ", tone: "none" },
      ],
    },
  ];
}

/** Total for one drawn segment, including any ids folded into it. */
export function bucketTotal(counts: BucketCounts, bucket: Bucket): number {
  return [bucket.id, ...(bucket.merges ?? [])].reduce(
    (sum, id) => sum + (counts[id] ?? 0),
    0,
  );
}
