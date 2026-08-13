import type { DeviceColumn } from "@/lib/devices/columns";
import { describeDeviceName, parseDeviceName } from "@/lib/devices/device-name";
import {
  EM_DASH,
  formatDate,
  formatDateTime,
  formatNumber,
  formatOfflineFor,
  formatText,
} from "@/lib/devices/format";
import type { Device } from "@/lib/devices/types";
import {
  describePatchGap,
  patchSeverity,
  patchStatus,
  type PatchSeverity,
} from "@/lib/devices/windows-servicing";

/** Same tone vocabulary the charts use: red is overdue, amber is scheduled. */
export const PATCH_TONE: Record<PatchSeverity, string> = {
  unsupported: "text-red-600 dark:text-red-400",
  critical: "text-red-600 dark:text-red-400",
  warning: "text-amber-600 dark:text-amber-500",
  ok: "text-zinc-400 dark:text-zinc-500",
};

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

  // The feature version on its own says almost nothing — 22H2 could be fully
  // patched or three years stale. The gap against Microsoft's published
  // revisions is the part worth reading, so it rides along under the version.
  if (column.key === "windowsVersion") {
    const status = patchStatus(device.osBuild, device.osUbr);
    const severity = patchSeverity(status);
    const gap = describePatchGap(status);

    return (
      <>
        {formatText(device.windowsVersion)}
        {gap ? (
          <span
            className={`block text-[10px] leading-tight font-normal ${PATCH_TONE[severity]}`}
          >
            {gap}
          </span>
        ) : null}
      </>
    );
  }

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
    // "ออฟไลน์" on its own does not distinguish a PC switched off ten minutes
    // ago from one that has been missing a fortnight, which is the only part of
    // being offline anyone needs to act on.
    const offlineFor = online ? null : formatOfflineFor(device.lastSeen);

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
          {offlineFor ? (
            <span className="block text-[10px] leading-tight font-normal text-zinc-400 dark:text-zinc-500">
              {offlineFor}
            </span>
          ) : null}
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
