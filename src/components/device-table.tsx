import Link from "next/link";

import { DeviceRows } from "@/components/device-rows";
import { columnWidths, TABLE_COLUMNS } from "@/lib/devices/columns";
import { buildQueryString, type RawSearchParams } from "@/lib/devices/filters";
import { formatNumber } from "@/lib/devices/format";
import type { Device, DeviceSort } from "@/lib/devices/types";

const WIDTHS = columnWidths(TABLE_COLUMNS);

/**
 * The Thai label, its English name and the sort arrow stack vertically rather
 * than sitting on one line: with `table-fixed` every column is only as wide as
 * its share of the page, and a one-line header would be the thing that forces
 * the table wider than the viewport.
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
  const nextDirection = active && sort?.direction === "asc" ? "desc" : "asc";
  const href = `/devices${buildQueryString(params, {
    sort: columnKey,
    dir: nextDirection,
    page: null,
  })}`;

  return (
    <th
      scope="col"
      className={`px-2.5 py-2 align-bottom font-medium ${align === "right" ? "text-right" : "text-left"}`}
    >
      <Link
        href={href}
        className="group block hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        <span>{label}</span>
        <span
          aria-hidden
          className={`ml-1 ${
            active
              ? "text-sky-600 dark:text-sky-400"
              : "text-zinc-300 opacity-0 group-hover:opacity-100 dark:text-zinc-600"
          }`}
        >
          {active && sort?.direction === "desc" ? "↓" : "↑"}
        </span>
        <span className="block text-[10px] leading-tight font-normal text-zinc-400 dark:text-zinc-500">
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
    "rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-300 dark:border-zinc-800 dark:text-zinc-700";

  return (
    <div className="flex items-center justify-between gap-4 border-t border-zinc-200 px-3 py-2.5 dark:border-zinc-800">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        แสดง {formatNumber(first)}–{formatNumber(last)} จาก {formatNumber(total)} รายการ
        <span className="ml-1 text-zinc-400 dark:text-zinc-500">
          (หน้า {page}/{lastPage})
        </span>
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={linkFor(page - 1)} className={buttonClass}>
            ← ก่อนหน้า
          </Link>
        ) : (
          <span className={disabledClass}>← ก่อนหน้า</span>
        )}
        {page < lastPage ? (
          <Link href={linkFor(page + 1)} className={buttonClass}>
            ถัดไป →
          </Link>
        ) : (
          <span className={disabledClass}>ถัดไป →</span>
        )}
      </div>
    </div>
  );
}

export function DeviceTable({
  devices,
  total,
  page,
  pageSize,
  sort,
  params,
}: {
  devices: Device[];
  total: number;
  page: number;
  pageSize: number;
  sort: DeviceSort | undefined;
  params: RawSearchParams;
}) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          รายการอุปกรณ์
          <span className="ml-1.5 text-xs font-normal text-zinc-400 dark:text-zinc-500">
            All devices
          </span>
        </h2>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          <span className="mr-2 text-zinc-400 dark:text-zinc-500">
            คลิกที่แถวเพื่อดูรายละเอียดทั้งหมด
          </span>
          {formatNumber(total)} รายการ
        </span>
      </div>

      {/*
        Every column is given a share of the table's width and cells wrap, so
        the whole row is readable at once — no horizontal scrollbar to drag and
        no columns hidden off the right edge.
      */}
      <table className="w-full table-fixed border-collapse text-xs">
        <colgroup>
          {WIDTHS.map((width, index) => (
            <col key={String(TABLE_COLUMNS[index].key)} style={{ width }} />
          ))}
        </colgroup>
        <thead className="border-y border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400">
          <tr>
            {TABLE_COLUMNS.map((column) => (
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
          </tr>
        </thead>
        <tbody>
          {devices.length === 0 ? (
            <tr>
              <td
                colSpan={TABLE_COLUMNS.length}
                className="px-3 py-12 text-center text-sm text-zinc-500 dark:text-zinc-400"
              >
                ไม่พบอุปกรณ์ที่ตรงกับตัวกรอง — ลองล้างตัวกรองบางส่วนดู
              </td>
            </tr>
          ) : (
            <DeviceRows devices={devices} columns={TABLE_COLUMNS} />
          )}
        </tbody>
      </table>

      <Pagination page={page} pageSize={pageSize} total={total} params={params} />
    </section>
  );
}
