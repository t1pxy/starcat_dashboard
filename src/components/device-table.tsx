import Link from "next/link";

import { DeviceRows } from "@/components/device-rows";
import { Card, CardHeader } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { MUTED_TEXT } from "@/components/ui/tone";
import { CardTitle } from "@/components/ui/typography";
import { TABLE_COLUMNS } from "@/lib/devices/columns";
import { buildQueryString, type RawSearchParams } from "@/lib/devices/filters";
import { formatNumber } from "@/lib/devices/format";
import type { Device, DeviceSort } from "@/lib/devices/types";

/**
 * The Thai label, its English name and the sort arrow stack vertically rather
 * than sitting on one line: with `table-fixed` every column is only as wide as
 * its share of the table, and a one-line header would be the thing that forces
 * the layout wider than it needs to be.
 *
 * `aria-sort` is what tells a screen reader that this column is the one the
 * table is ordered by, and in which direction — the arrow glyph is `aria-hidden`
 * and says nothing on its own.
 */
function SortHeader({
  columnKey,
  label,
  english,
  sort,
  params,
  align,
}: {
  columnKey: string;
  label: string;
  english: string;
  sort: DeviceSort | undefined;
  params: RawSearchParams;
  align: "left" | "right";
}) {
  const active = sort?.column === columnKey;
  // Clicking the active column flips direction; a new column starts ascending.
  const descending = active && sort?.direction === "desc";
  const nextDirection = descending ? "asc" : "desc";
  const href = `/devices${buildQueryString(params, {
    sort: columnKey,
    dir: active ? nextDirection : "asc",
    page: null,
  })}`;

  return (
    <th
      scope="col"
      aria-sort={active ? (descending ? "descending" : "ascending") : "none"}
      className={`px-2.5 py-2 align-bottom font-medium ${align === "right" ? "text-right" : "text-left"}`}
    >
      <Link
        href={href}
        className="group block rounded-sm hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        <span>{label}</span>
        <span
          aria-hidden
          className={`ml-1 ${
            active
              ? "text-sky-600 dark:text-sky-400"
              : "text-zinc-400 opacity-0 group-hover:opacity-100 dark:text-zinc-500"
          }`}
        >
          {descending ? "↓" : "↑"}
        </span>
        <span
          lang="en"
          className="block text-[11px] leading-tight font-normal text-zinc-500 dark:text-zinc-400"
        >
          {english}
        </span>
      </Link>
    </th>
  );
}

function Pagination({
  page,
  pageSize,
  total,
  params,
}: {
  page: number;
  pageSize: number;
  total: number;
  params: RawSearchParams;
}) {
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  if (lastPage === 1) return null;

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  const linkFor = (target: number) =>
    `/devices${buildQueryString(params, { page: String(target) })}`;

  const buttonClass =
    "rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500";
  const disabledClass =
    "rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-400 dark:border-zinc-800 dark:text-zinc-600";

  return (
    // Wraps rather than squeezing: on a narrow screen the count moves above the
    // buttons instead of both being crushed onto one line.
    <nav
      aria-label="แบ่งหน้า"
      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-zinc-200 px-3 py-2.5 dark:border-zinc-800"
    >
      <p className={`text-xs ${MUTED_TEXT}`}>
        แสดง {formatNumber(first)}–{formatNumber(last)} จาก {formatNumber(total)} รายการ
        <span className="ml-1">
          (หน้า {page}/{lastPage})
        </span>
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={linkFor(page - 1)} className={buttonClass} rel="prev">
            ← ก่อนหน้า
          </Link>
        ) : (
          <span className={disabledClass} aria-disabled>
            ← ก่อนหน้า
          </span>
        )}
        {page < lastPage ? (
          <Link href={linkFor(page + 1)} className={buttonClass} rel="next">
            ถัดไป →
          </Link>
        ) : (
          <span className={disabledClass} aria-disabled>
            ถัดไป →
          </span>
        )}
      </div>
    </nav>
  );
}

export function DeviceTable({
  devices,
  total,
  page,
  pageSize,
  sort,
  params,
  filtersActive,
}: {
  devices: Device[];
  total: number;
  page: number;
  pageSize: number;
  sort: DeviceSort | undefined;
  params: RawSearchParams;
  /** Whether the empty state should offer to clear the filters that emptied it. */
  filtersActive: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle
          title="รายการอุปกรณ์"
          english="All devices"
          hint="คลิกที่แถวเพื่อดูรายละเอียดทั้งหมด"
        />
        <span className={`text-xs ${MUTED_TEXT}`}>
          {formatNumber(total)} รายการ
        </span>
      </CardHeader>

      <DataTable
        columns={TABLE_COLUMNS}
        // Twelve columns need about 64rem before they stop being legible; below
        // that the table scrolls sideways rather than breaking every cell onto
        // eight lines.
        minWidth="min-w-[64rem] xl:min-w-0"
        headRow={TABLE_COLUMNS.map((column) => (
          <SortHeader
            key={String(column.key)}
            columnKey={String(column.key)}
            label={column.label}
            english={column.english}
            sort={sort}
            params={params}
            align={column.kind === "number" ? "right" : "left"}
          />
        ))}
        rowCount={devices.length}
        emptyState={
          <div className="py-6">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              ไม่พบอุปกรณ์ที่ตรงกับตัวกรอง
            </p>
            {filtersActive ? (
              // An empty state that names the cause should also offer the cure.
              <Link
                href="/devices"
                className="mt-3 inline-block rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500"
              >
                ล้างตัวกรองทั้งหมด
              </Link>
            ) : null}
          </div>
        }
      >
        <DeviceRows devices={devices} columns={TABLE_COLUMNS} />
      </DataTable>

      <Pagination page={page} pageSize={pageSize} total={total} params={params} />
    </Card>
  );
}
