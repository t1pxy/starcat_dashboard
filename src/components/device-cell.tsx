import { MUTED_TEXT, PLACEHOLDER_TEXT, TONE_TEXT } from "@/components/ui/tone";
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

/**
 * Patch severity, said in the dashboard's shared tone vocabulary.
 *
 * "unsupported" and "critical" are both red because both are already overdue —
 * one needs a new Windows, the other needs the updates it has skipped. "ok" is
 * deliberately muted rather than green: a fully patched machine is the
 * expectation, not an achievement worth colouring.
 */
export const PATCH_TONE: Record<PatchSeverity, string> = {
  unsupported: TONE_TEXT.critical,
  critical: TONE_TEXT.critical,
  warning: TONE_TEXT.warning,
  ok: MUTED_TEXT,
};

/** A secondary line under a cell's main value — the decoded name, the patch
 *  gap, how long a machine has been offline. */
function SubLine({
  children,
  className = MUTED_TEXT,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={`block text-[11px] leading-tight font-normal ${className}`}>
      {children}
    </span>
  );
}

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
        {gap ? <SubLine className={PATCH_TONE[severity]}>{gap}</SubLine> : null}
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
        {parts ? <SubLine>{describeDeviceName(parts)}</SubLine> : null}
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
      <span className="inline-flex items-start gap-1.5">
        <span
          aria-hidden
          className={`mt-1.5 size-1.5 shrink-0 rounded-full ${
            online ? "bg-emerald-500" : "bg-zinc-400 dark:bg-zinc-600"
          }`}
        />
        <span className={online ? "text-emerald-700 dark:text-emerald-400" : ""}>
          {online ? "ออนไลน์" : "ออฟไลน์"}
          {offlineFor ? <SubLine>{offlineFor}</SubLine> : null}
        </span>
      </span>
    );
  }

  if (value === null || value === undefined) {
    return <span className={PLACEHOLDER_TEXT}>{EM_DASH}</span>;
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
