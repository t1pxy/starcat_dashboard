"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

import { DeviceCell } from "@/components/device-cell";
import { DeviceDetailDialog } from "@/components/device-detail-dialog";
import type { DeviceColumn } from "@/lib/devices/columns";
import { formatDaysAgo } from "@/lib/devices/format";
import type { Device } from "@/lib/devices/types";

/**
 * The rows of a device table, and which one is open.
 *
 * This is the only client component in the tables; the surrounding chrome,
 * headers and pagination stay on the server. The markup below is deliberately
 * identical to what the server used to render, so nothing about the table's
 * layout depends on the browser having caught up.
 *
 * The panel a click opens lives in `device-detail-dialog.tsx` — rendering a row
 * and rendering a full record are two different jobs, and keeping them in one
 * file made it 320 lines with three reasons to change.
 */
export function DeviceRows({
  devices,
  columns,
}: {
  devices: Device[];
  columns: DeviceColumn[];
}) {
  const [selected, setSelected] = useState<Device | null>(null);

  return (
    <>
      {devices.map((device) => (
        <tr
          key={device.agentId}
          onClick={() => setSelected(device)}
          className="cursor-pointer border-b border-zinc-100 last:border-0 hover:bg-zinc-50 dark:border-zinc-800/60 dark:hover:bg-zinc-800/40"
        >
          {columns.map((column) => (
            <td
              key={String(column.key)}
              className={`px-2.5 py-2 align-top break-words text-zinc-700 dark:text-zinc-300 ${
                column.kind === "number" ? "text-right" : ""
              } ${
                column.key === "deviceName"
                  ? "font-medium text-zinc-900 dark:text-zinc-100"
                  : ""
              }`}
            >
              {/*
                The whole row is the click target, but a row is not reachable by
                keyboard. The name cell doubles as a real button so tabbing
                through the table opens the same panel.
              */}
              {column.key === "deviceName" ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelected(device);
                  }}
                  className="text-left hover:underline focus-visible:underline focus-visible:outline-none"
                >
                  <DeviceCell device={device} column={column} />
                </button>
              ) : column.key === "daysSinceSeen" ? (
                // "412 วันที่แล้ว" reads better than a bare 412 in a work queue.
                formatDaysAgo(device.daysSinceSeen)
              ) : (
                <DeviceCell device={device} column={column} />
              )}
            </td>
          ))}
        </tr>
      ))}

      {/*
        Rendered into <body> rather than here: a <dialog> is not valid inside a
        <tbody>, and nothing renders at all until a row is clicked, so the
        server-rendered table and the hydrated one match exactly.
      */}
      {selected
        ? createPortal(
            <DeviceDetailDialog
              device={selected}
              onClose={() => setSelected(null)}
            />,
            document.body,
          )
        : null}
    </>
  );
}
