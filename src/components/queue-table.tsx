import { DeviceCell } from "@/components/device-cell";
import { columnWidths, type DeviceColumn } from "@/lib/devices/columns";
import { formatDaysAgo, formatNumber } from "@/lib/devices/format";
import type { Device } from "@/lib/devices/types";

/**
 * One work queue: a list of machines that all need the *same* thing done.
 *
 * The two queues used to share a single table with a "reason" column on every
 * row. Splitting them means the reason is stated once, in the heading, and each
 * table carries only the columns that matter to its own job — which is also how
 * both fit on screen without scrolling sideways.
 */
export type QueueTone = "warn" | "bad";

const TONE: Record<
  QueueTone,
  { border: string; head: string; count: string }
> = {
  warn: {
    border: "border-amber-200 dark:border-amber-900/60",
    head: "bg-amber-50/60 dark:bg-amber-950/20",
    count: "text-amber-700 dark:text-amber-300",
  },
  bad: {
    border: "border-red-200 dark:border-red-900/60",
    head: "bg-red-50/60 dark:bg-red-950/20",
    count: "text-red-700 dark:text-red-300",
  },
};

export function QueueTable({
  title,
  english,
  description,
  tone,
  columns,
  devices,
  emptyLabel,
  limit,
}: {
  title: string;
  english: string;
  /** What every row in this table has in common, and what to do about it. */
  description: string;
  tone: QueueTone;
  columns: DeviceColumn[];
  devices: Device[];
  emptyLabel: string;
  /** Row cap applied by the query, so a truncated list can say so. */
  limit: number;
}) {
  const widths = columnWidths(columns);
  const styles = TONE[tone];

  return (
    <section
      className={`rounded-xl border bg-white dark:bg-zinc-900 ${styles.border}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {title}
            <span className="ml-1.5 text-xs font-normal text-zinc-400 dark:text-zinc-500">
              {english}
            </span>
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {description}
          </p>
        </div>
        <p className={`text-sm font-semibold tabular-nums ${styles.count}`}>
          {formatNumber(devices.length)}
          {devices.length >= limit ? "+" : ""}
          <span className="ml-1 text-xs font-normal text-zinc-500 dark:text-zinc-400">
            เครื่อง
          </span>
        </p>
      </div>

      <TableFrame
        columns={columns}
        widths={widths}
        headClass={styles.head}
        rowCount={devices.length}
        emptyLabel={emptyLabel}
      >
        {devices.map((device) => (
          <tr
            key={device.agentId}
            className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50 dark:border-zinc-800/60 dark:hover:bg-zinc-800/40"
          >
            {columns.map((column) => (
              <Cell key={String(column.key)} device={device} column={column} />
            ))}
          </tr>
        ))}
      </TableFrame>
    </section>
  );
}

/**
 * The table chrome shared by both queues. `table-fixed` plus explicit column
 * widths is what keeps everything inside the viewport: cells wrap instead of
 * pushing the table wider than the page.
 */
function TableFrame({
  columns,
  widths,
  headClass,
  rowCount,
  emptyLabel,
  children,
}: {
  columns: DeviceColumn[];
  widths: string[];
  headClass: string;
  rowCount: number;
  emptyLabel: string;
  children: React.ReactNode;
}) {
  return (
    <table className="w-full table-fixed border-collapse text-xs">
      <colgroup>
        {widths.map((width, index) => (
          <col key={String(columns[index].key)} style={{ width }} />
        ))}
      </colgroup>
      <thead
        className={`border-y border-zinc-200 text-zinc-600 dark:border-zinc-800 dark:text-zinc-400 ${headClass}`}
      >
        <tr>
          {columns.map((column) => (
            <th
              key={String(column.key)}
              scope="col"
              className={`px-2.5 py-2 align-bottom font-medium ${
                column.kind === "number" ? "text-right" : "text-left"
              }`}
            >
              {column.label}
              <span className="block text-[10px] leading-tight font-normal text-zinc-400 dark:text-zinc-500">
                {column.english}
              </span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rowCount === 0 ? (
          <tr>
            <td
              colSpan={columns.length}
              className="px-3 py-10 text-center text-sm text-emerald-700 dark:text-emerald-400"
            >
              {emptyLabel}
            </td>
          </tr>
        ) : (
          children
        )}
      </tbody>
    </table>
  );
}

function Cell({ device, column }: { device: Device; column: DeviceColumn }) {
  return (
    <td
      className={`px-2.5 py-2 align-top break-words text-zinc-700 dark:text-zinc-300 ${
        column.kind === "number" ? "text-right" : ""
      } ${
        column.key === "deviceName"
          ? "font-medium text-zinc-900 dark:text-zinc-100"
          : ""
      }`}
    >
      {/* "ไม่ติดต่อ 412 วัน" reads better than a bare 412 in a work queue. */}
      {column.key === "daysSinceSeen" ? (
        formatDaysAgo(device.daysSinceSeen)
      ) : (
        <DeviceCell device={device} column={column} />
      )}
    </td>
  );
}
