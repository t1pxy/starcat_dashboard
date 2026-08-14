import { columnWidths, type DeviceColumn } from "@/lib/devices/columns";
import { TONE_TABLE_HEAD, type Tone } from "./tone";

/**
 * The table chrome shared by the device list and both work queues.
 *
 * There used to be two copies of this — one inside `queue-table.tsx`, one
 * inlined in `device-table.tsx` — which is how the two ended up with different
 * empty-row padding and different header borders.
 *
 * Responsive behaviour is the reason this exists as a component rather than a
 * copied `<table>`. `table-fixed` with percentage columns was laying twelve
 * columns out inside a 375px phone, giving "ชื่อเครื่อง" about 35px and breaking
 * `25PDT001` across eight lines. The table now keeps a readable minimum width
 * and scrolls sideways below the breakpoint where its columns fit, so nothing is
 * hidden and nothing is squeezed — the desktop layout is untouched.
 */
export function DataTable({
  columns,
  tone = "neutral",
  /** Tailwind pair like `min-w-[64rem] lg:min-w-0` — the width below which this
   *  table scrolls rather than compresses. Depends on the column count. */
  minWidth,
  headRow,
  rowCount,
  emptyState,
  children,
}: {
  columns: DeviceColumn[];
  tone?: Tone;
  minWidth: string;
  /** The `<th>` cells; the `<tr>` around them belongs to this component. */
  headRow: React.ReactNode;
  rowCount: number;
  emptyState: React.ReactNode;
  children: React.ReactNode;
}) {
  const widths = columnWidths(columns);

  return (
    <div className="overflow-x-auto">
      <table
        className={`w-full table-fixed border-collapse text-xs ${minWidth}`}
      >
        <colgroup>
          {widths.map((width, index) => (
            <col key={String(columns[index].key)} style={{ width }} />
          ))}
        </colgroup>
        <thead className="border-y border-zinc-200 text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
          <tr className={TONE_TABLE_HEAD[tone]}>{headRow}</tr>
        </thead>
        <tbody>
          {rowCount === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-10 text-center">
                {emptyState}
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
}

/** A plain column header — label over its English name. Sortable headers build
 *  their own cell (see `device-table.tsx`) but keep this alignment rule. */
export function ColumnHead({ column }: { column: DeviceColumn }) {
  return (
    <th
      scope="col"
      className={`px-2.5 py-2 align-bottom font-medium ${
        column.kind === "number" ? "text-right" : "text-left"
      }`}
    >
      {column.label}
      <span
        lang="en"
        className="block text-[11px] leading-tight font-normal text-zinc-500 dark:text-zinc-400"
      >
        {column.english}
      </span>
    </th>
  );
}
