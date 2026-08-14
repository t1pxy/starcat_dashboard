import { DeviceRows } from "@/components/device-rows";
import { Card, CardHeader } from "@/components/ui/card";
import { ColumnHead, DataTable } from "@/components/ui/data-table";
import { CardTitle } from "@/components/ui/typography";
import { TONE_TEXT, type Tone } from "@/components/ui/tone";
import { columnWidths, type DeviceColumn } from "@/lib/devices/columns";
import { formatNumber } from "@/lib/devices/format";
import type { Device } from "@/lib/devices/types";

/**
 * One work queue: a list of machines that all need the *same* thing done.
 *
 * The two queues used to share a single table with a "reason" column on every
 * row. Splitting them means the reason is stated once, in the heading, and each
 * table carries only the columns that matter to its own job.
 */
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
  tone: Extract<Tone, "warning" | "critical">;
  columns: DeviceColumn[];
  devices: Device[];
  emptyLabel: string;
  /** Row cap applied by the query, so a truncated list can say so. */
  limit: number;
}) {
  return (
    <Card tone={tone}>
      <CardHeader>
        <CardTitle title={title} english={english} hint={description} />
        <p className={`text-sm font-semibold tabular-nums ${TONE_TEXT[tone]}`}>
          {formatNumber(devices.length)}
          {devices.length >= limit ? "+" : ""}
          <span className="ml-1 text-xs font-normal text-zinc-500 dark:text-zinc-400">
            เครื่อง
          </span>
        </p>
      </CardHeader>

      <DataTable
        widths={columnWidths(columns)}
        tone={tone}
        // Seven or eight columns need roughly 48rem before they stop being
        // readable; below that the table scrolls instead of compressing.
        minWidth="min-w-[48rem] lg:min-w-0"
        headRow={columns.map((column) => (
          <ColumnHead key={String(column.key)} column={column} />
        ))}
        rowCount={devices.length}
        emptyState={
          <span className="text-sm text-emerald-700 dark:text-emerald-400">
            {emptyLabel}
          </span>
        }
      >
        <DeviceRows devices={devices} columns={columns} />
      </DataTable>
    </Card>
  );
}
