import Link from "next/link";

import { Card, CardHeader } from "@/components/ui/card";
import { MUTED_TEXT, PLACEHOLDER_TEXT, TONE_TEXT, type Tone } from "@/components/ui/tone";
import { Bilingual, CardTitle } from "@/components/ui/typography";
import { buildQueryString, type RawSearchParams } from "@/lib/devices/filters";
import { formatNumber } from "@/lib/devices/format";
import { STATUS_COLOR } from "@/lib/devices/status";
import type { DepartmentHealth as Row } from "@/lib/devices/types";

/**
 * Fleet health per department — how big each department's estate is, how much
 * of it is answering right now, and how much work is outstanding on it.
 *
 * A table rather than a chart, because there are four numbers per department
 * and the reader's job is to scan for the bad ones. The share of a department
 * that is online is the one quantity worth *seeing* rather than reading, so it
 * gets a bar; the two work counts stay as numbers, coloured only when they are
 * non-zero — a coloured cell here always means "there is something to do".
 */
export function DepartmentHealthTable({
  departments,
  params,
}: {
  departments: Row[];
  params: RawSearchParams;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle
          title="สถานะอุปกรณ์แยกตามหน่วยงาน"
          english="Fleet health by department"
          hint="คลิกชื่อหน่วยงานเพื่อกรองทั้ง dashboard เฉพาะหน่วยงานนั้น"
        />
        <Legend />
      </CardHeader>

      {/* Five columns, one of them a bar — below ~36rem they stop being
          readable, so the table scrolls rather than compressing. */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] table-fixed border-collapse text-xs sm:min-w-0">
          <colgroup>
            <col style={{ width: "22%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "40%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "15%" }} />
          </colgroup>
          <thead className="border-y border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400">
            <tr>
              <Th>
                หน่วยงาน
                <Sub>Department</Sub>
              </Th>
              <Th align="right">
                ทั้งหมด
                <Sub>Total</Sub>
              </Th>
              <Th>
                ออนไลน์ / ออฟไลน์
                <Sub>Online / Offline</Sub>
              </Th>
              <Th align="right">
                ต้องอัพเดท
                <Sub>Needs update</Sub>
              </Th>
              <Th align="right">
                ไม่ได้ใช้งานนาน
                <Sub>Inactive</Sub>
              </Th>
            </tr>
          </thead>
          <tbody>
            {departments.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className={`px-3 py-10 text-center text-sm ${MUTED_TEXT}`}
                >
                  ไม่พบอุปกรณ์ที่ตรงกับตัวกรอง
                </td>
              </tr>
            ) : (
              departments.map((row) => (
                <tr
                  key={row.department}
                  className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50 dark:border-zinc-800/60 dark:hover:bg-zinc-800/40"
                >
                  <td className="px-2.5 py-2 align-middle break-words font-medium text-zinc-900 dark:text-zinc-100">
                    <Link
                      href={`/devices/charts${buildQueryString(params, {
                        department: row.department,
                      })}`}
                      className="rounded-sm hover:underline"
                    >
                      {row.department}
                    </Link>
                  </td>
                  <td className="px-2.5 py-2 text-right align-middle tabular-nums text-zinc-700 dark:text-zinc-300">
                    {formatNumber(row.total)}
                  </td>
                  <td className="px-2.5 py-2 align-middle">
                    <OnlineBar row={row} />
                  </td>
                  <WorkCount value={row.outdated} tone="warning" />
                  <WorkCount value={row.stale} tone="critical" />
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      scope="col"
      className={`px-2.5 py-2 align-bottom font-medium ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function Sub({ children }: { children: React.ReactNode }) {
  return (
    <Bilingual className="block text-[11px] leading-tight">{children}</Bilingual>
  );
}

/**
 * Each bar fills its own row and splits by state, so what the eye compares
 * down the column is the *share* of a department that is answering — which is
 * the question, and which an absolute scale would have made unreadable for
 * every department but the largest. Size is carried by the "ทั้งหมด" column
 * next to it, and the two counts are written out beside the bar, so identity
 * never rests on colour alone.
 */
function OnlineBar({ row }: { row: Row }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex h-4 min-w-0 flex-1 gap-0.5 overflow-hidden rounded"
        title={`ออนไลน์ ${formatNumber(row.online)} · ออฟไลน์ ${formatNumber(row.offline)}`}
      >
        {row.online > 0 ? (
          <div
            style={{
              width: `${(row.online / row.total) * 100}%`,
              backgroundColor: STATUS_COLOR.good,
            }}
            className="first:rounded-l last:rounded-r"
          />
        ) : null}
        {row.offline > 0 ? (
          <div
            style={{
              width: `${(row.offline / row.total) * 100}%`,
              backgroundColor: STATUS_COLOR.none,
            }}
            className="first:rounded-l last:rounded-r"
          />
        ) : null}
      </div>
      <span className={`w-20 shrink-0 text-right tabular-nums ${MUTED_TEXT}`}>
        {formatNumber(row.online)} / {formatNumber(row.offline)}
      </span>
    </div>
  );
}

/** Zero is the good case and stays quiet; any other number wears its tone. */
function WorkCount({
  value,
  tone,
}: {
  value: number;
  tone: Extract<Tone, "warning" | "critical">;
}) {
  return (
    <td className="px-2.5 py-2 text-right align-middle tabular-nums">
      {value === 0 ? (
        <span className={PLACEHOLDER_TEXT}>—</span>
      ) : (
        <span className={`font-medium ${TONE_TEXT[tone]}`}>
          {formatNumber(value)}
        </span>
      )}
    </td>
  );
}

function Legend() {
  return (
    <ul className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-xs ${MUTED_TEXT}`}>
      {[
        { label: "ออนไลน์", color: STATUS_COLOR.good },
        { label: "ออฟไลน์", color: STATUS_COLOR.none },
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
