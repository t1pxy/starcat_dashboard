"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { DeviceCell, PATCH_TONE } from "@/components/device-cell";
import {
  columnFor,
  DETAIL_SECTIONS,
  type DeviceColumn,
} from "@/lib/devices/columns";
import { describeDeviceName, parseDeviceName } from "@/lib/devices/device-name";
import {
  EM_DASH,
  formatDate,
  formatDaysAgo,
  formatGb,
  formatNumber,
  formatWarrantyDays,
  formatYears,
} from "@/lib/devices/format";
import type { Device } from "@/lib/devices/types";
import {
  describePatchGap,
  patchSeverity,
  patchStatus,
  REFERENCE_DATE,
} from "@/lib/devices/windows-servicing";

/**
 * The rows of a device table, and the panel that opens when one is clicked.
 *
 * A row can only carry a dozen columns before it stops being readable, so the
 * other twenty fields used to live only in the Excel export — you had to
 * download a file to answer "what is the serial number of this one machine".
 * Clicking a row now reads the same record the second way: one device, every
 * field it has, grouped by the question it answers.
 *
 * This is the only client component in the tables; the surrounding chrome,
 * headers and pagination stay on the server. The markup below is deliberately
 * identical to what the server used to render, so nothing about the table's
 * layout depends on the browser having caught up.
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

/**
 * One device, read in full.
 *
 * `showModal()` rather than the `open` attribute: it is what gives us the
 * backdrop, the focus trap and Escape-to-close for free, instead of three
 * hand-rolled approximations of them.
 */
function DeviceDetailDialog({
  device,
  onClose,
}: {
  device: Device;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const parts = parseDeviceName(device.deviceName);
  // Agent-collected fields are blank on anything that is not a managed PC, so a
  // printer would otherwise show two sections of em dashes.
  const isComputer = device.deviceType === "COMPUTER";

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      // A <dialog> fills its own box, so a click that lands on the element
      // itself (rather than on the panel inside it) is a click on the backdrop.
      onClick={(event) => {
        if (event.target === ref.current) ref.current?.close();
      }}
      className="m-auto w-[min(48rem,92vw)] rounded-xl border border-zinc-200 bg-white p-0 text-zinc-900 backdrop:bg-zinc-900/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
    >
      <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
        <div>
          <h2 className="text-base font-semibold">{device.deviceName}</h2>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {[parts ? describeDeviceName(parts) : null, device.category]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => ref.current?.close()}
          className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500"
        >
          ปิด
        </button>
      </div>

      <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
        {isComputer ? <PatchSummary device={device} /> : null}

        {DETAIL_SECTIONS.map((section) => {
          const keys = section.keys.filter(
            (key) => isComputer || !columnFor(key).computerOnly,
          );
          if (keys.length === 0) return null;

          return (
            <section key={section.title} className="mb-5 last:mb-0">
              <h3 className="mb-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                {section.title}
                <span className="ml-1.5 font-normal text-zinc-400 dark:text-zinc-500">
                  {section.english}
                </span>
              </h3>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
                {keys.map((key) => (
                  <Field key={String(key)} device={device} field={key} />
                ))}
              </dl>
            </section>
          );
        })}
      </div>
    </dialog>
  );
}

/**
 * Where this machine's Windows sits against Microsoft's own release history.
 *
 * Given its own block above the field grid because it is the one thing on the
 * panel that is a *judgement* rather than a stored value — every row below is
 * something Starcat recorded, this is what it means.
 */
function PatchSummary({ device }: { device: Device }) {
  const status = patchStatus(device.osBuild, device.osUbr);
  if (!status) return null;

  const severity = patchSeverity(status);
  const tone = {
    unsupported: "border-red-300 bg-red-50 dark:border-red-900/60 dark:bg-red-950/30",
    critical: "border-red-300 bg-red-50 dark:border-red-900/60 dark:bg-red-950/30",
    warning: "border-amber-300 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/30",
    ok: "border-emerald-300 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/30",
  }[severity];

  return (
    <section className={`mb-5 rounded-lg border p-3 ${tone}`}>
      <h3 className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
        ระดับแพตช์เทียบกับ Microsoft
        <span className="ml-1.5 font-normal text-zinc-400 dark:text-zinc-500">
          Patch level vs Microsoft
        </span>
      </h3>

      <p className={`mt-1 text-sm font-medium ${PATCH_TONE[severity]}`}>
        {describePatchGap(status)}
      </p>

      <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
        <Pair label="เครื่องนี้" value={status.level} />
        <Pair
          label="ล่าสุดจาก Microsoft"
          value={`${device.osBuild}.${status.latest.ubr}${
            status.latest.kb ? ` (${status.latest.kb})` : ""
          }`}
        />
        <Pair
          label="แพตช์ที่เครื่องนี้ติดตั้ง"
          value={
            status.current
              ? `${formatDate(status.current.date)}${status.current.kb ? ` · ${status.current.kb}` : ""}`
              : "ไม่อยู่ในรายการของ Microsoft"
          }
        />
        <Pair
          label="Microsoft ออกอัพเดทถึง"
          value={
            status.unsupported
              ? "หยุดออกอัพเดทแล้ว — ควรอัพเกรด Windows"
              : status.endOfServicing
                ? `${formatDate(status.endOfServicing)}${
                    status.daysUntilEndOfServicing !== null
                      ? ` (อีก ${formatNumber(status.daysUntilEndOfServicing)} วัน)`
                      : ""
                  }`
                : EM_DASH
          }
        />
      </dl>

      <p className="mt-2 text-[10px] text-zinc-400 dark:text-zinc-500">
        อ้างอิงตารางรุ่นของ Microsoft ณ {formatDate(REFERENCE_DATE)} · อัพเดทด้วย
        <code className="mx-1">pnpm windows:refresh</code>
      </p>
    </section>
  );
}

function Pair({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-current/10 py-0.5">
      <dt className="text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="text-right tabular-nums text-zinc-800 dark:text-zinc-200">
        {value}
      </dd>
    </div>
  );
}

/**
 * One label/value pair. Bare numbers lose their meaning once they are out of a
 * column with a unit in its header, so the four numeric fields carry their unit
 * with them here; everything else renders exactly as the table renders it.
 */
function Field({ device, field }: { device: Device; field: keyof Device }) {
  const column = columnFor(field);

  return (
    <div className="flex flex-col border-b border-zinc-100 py-1 dark:border-zinc-800/60">
      <dt className="text-[11px] text-zinc-500 dark:text-zinc-400">
        {column.label}
        <span className="ml-1 text-zinc-400 dark:text-zinc-500">
          {column.english}
        </span>
      </dt>
      <dd className="text-sm break-words">
        <DetailValue device={device} field={field} />
      </dd>
    </div>
  );
}

function DetailValue({ device, field }: { device: Device; field: keyof Device }) {
  switch (field) {
    case "ageYears":
      return <>{formatYears(device.ageYears)}</>;
    case "warrantyDaysLeft":
      return <>{formatWarrantyDays(device.warrantyDaysLeft)}</>;
    case "daysSinceSeen":
      return <>{formatDaysAgo(device.daysSinceSeen)}</>;
    case "memoryGb":
      return <>{formatGb(device.memoryGb)}</>;
    case "storageGb":
      return <>{formatGb(device.storageGb)}</>;
    default:
      return <DeviceCell device={device} column={columnFor(field)} />;
  }
}
