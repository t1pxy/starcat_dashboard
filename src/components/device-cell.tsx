import type { DeviceColumn } from "@/lib/devices/columns";
import { describeDeviceName, parseDeviceName } from "@/lib/devices/device-name";
import {
  EM_DASH,
  formatDate,
  formatDateTime,
  formatNumber,
  formatText,
} from "@/lib/devices/format";
import type { Device } from "@/lib/devices/types";

/** Renders one cell according to its column kind, so the table and the export
 *  agree on what every field means. */
export function DeviceCell({
  device,
  column,
}: {
  device: Device;
  column: DeviceColumn;
}) {
  const value = device[column.key];

  // The name itself carries the year, purchase-vs-lease and desktop-vs-laptop.
  // Spelling that out under the name saves reading the code by eye on every row.
  if (column.key === "deviceName") {
    const parts = parseDeviceName(device.deviceName);
    return (
      <>
        {formatText(device.deviceName)}
        {parts ? (
          <span className="block text-[10px] leading-tight font-normal text-zinc-400 dark:text-zinc-500">
            {describeDeviceName(parts)}
          </span>
        ) : null}
      </>
    );
  }

  if (column.kind === "boolean") {
    const online = Boolean(value);
    return (
      <span className="inline-flex items-center gap-1.5">
        <span
          aria-hidden
          className={`size-1.5 rounded-full ${
            online ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-600"
          }`}
        />
        <span className={online ? "text-emerald-700 dark:text-emerald-400" : ""}>
          {online ? "ออนไลน์" : "ออฟไลน์"}
        </span>
      </span>
    );
  }

  if (value === null || value === undefined) {
    return <span className="text-zinc-300 dark:text-zinc-600">{EM_DASH}</span>;
  }

  switch (column.kind) {
    case "date":
      return <>{formatDate(value as string)}</>;
    case "datetime":
      return <>{formatDateTime(value as string)}</>;
    case "number":
      return <span className="tabular-nums">{formatNumber(value as number)}</span>;
    default:
      return <>{formatText(value as string)}</>;
  }
}
