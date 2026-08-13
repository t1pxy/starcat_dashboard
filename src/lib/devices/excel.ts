import "server-only";

import ExcelJS from "exceljs";

import {
  DEVICE_COLUMNS,
  OUTDATED_COLUMNS,
  STALE_COLUMNS,
  type DeviceColumn,
} from "./columns";
import { staleThreshold } from "./filters";
import { EXPIRING_SOON_DAYS } from "./schema";
import type { Device, DeviceFilters, Summary } from "./types";

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF1E3A5F" },
};

const DATE_FORMAT = "dd/mm/yyyy";
const DATETIME_FORMAT = "dd/mm/yyyy hh:mm";

/** Excel wants real `Date` objects, not the ISO strings the UI carries. */
function toDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function cellValue(device: Device, column: DeviceColumn): ExcelJS.CellValue {
  const raw = device[column.key];
  if (raw === null || raw === undefined) return null;

  switch (column.kind) {
    case "date":
    case "datetime":
      return toDate(raw as string);
    case "boolean":
      return raw ? "ออนไลน์" : "ออฟไลน์";
    case "number":
      return typeof raw === "number" ? raw : Number(raw);
    default:
      return String(raw);
  }
}

function numberFormatFor(kind: DeviceColumn["kind"]): string | undefined {
  if (kind === "date") return DATE_FORMAT;
  if (kind === "datetime") return DATETIME_FORMAT;
  return undefined;
}

/**
 * Builds one data sheet: bilingual wrapped header, frozen top row, autofilter,
 * and per-column number formats so dates stay sortable inside Excel rather
 * than arriving as text.
 */
function addDataSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  columns: DeviceColumn[],
  devices: Device[],
): void {
  const sheet = workbook.addWorksheet(name, {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  sheet.columns = columns.map((column) => ({
    key: String(column.key),
    width: column.width,
  }));

  const header = sheet.getRow(1);
  columns.forEach((column, index) => {
    const cell = header.getCell(index + 1);
    cell.value = `${column.label}\n${column.english}`;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.fill = HEADER_FILL;
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  });
  header.height = 32;

  for (const device of devices) {
    const row = sheet.addRow(
      Object.fromEntries(
        columns.map((column) => [String(column.key), cellValue(device, column)]),
      ),
    );
    columns.forEach((column, index) => {
      const cell = row.getCell(index + 1);
      const format = numberFormatFor(column.kind);
      if (format) cell.numFmt = format;
      if (column.kind === "number") {
        cell.alignment = { horizontal: "right" };
      }
    });
  }

  // Autofilter over the header even when there are no data rows, so the file
  // still opens with working filter dropdowns.
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(1, devices.length + 1), column: columns.length },
  };
}

const FILTER_LABELS: Record<string, string> = {
  search: "ค้นหา (Search)",
  deviceType: "ประเภท (Type)",
  category: "หมวดหมู่ (Category)",
  brand: "ยี่ห้อ (Brand)",
  model: "รุ่น (Model)",
  department: "หน่วยงาน (Department)",
  location: "สถานที่ (Location)",
  windowsVersion: "เวอร์ชัน Windows",
  online: "สถานะออนไลน์",
  warrantyWithinDays: "ประกันเหลือไม่เกิน (วัน)",
  staleDays: "ไม่ติดต่อตั้งแต่ (วัน)",
  minAgeYears: "อายุอย่างน้อย (ปี)",
  outdatedOnly: "เฉพาะเครื่องที่ Windows ไม่ใช่เวอร์ชันล่าสุด",
};

function describeFilterValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  if (value === true) return "ใช่";
  if (value === "true") return "ออนไลน์";
  if (value === "false") return "ออฟไลน์";
  return String(value);
}

/**
 * A cover sheet stating what the file contains. Without it an exported xlsx is
 * just a pile of rows with no record of which filters produced it.
 */
function addSummarySheet(
  workbook: ExcelJS.Workbook,
  summary: Summary,
  filters: DeviceFilters,
  exportedRows: number,
): void {
  const sheet = workbook.addWorksheet("สรุป (Summary)", {
    views: [{ showGridLines: false }],
  });
  sheet.columns = [{ width: 42 }, { width: 30 }];

  const title = sheet.addRow(["รายงานอุปกรณ์ Starcat Helpdesk"]);
  title.font = { bold: true, size: 16 };
  sheet.addRow(["Starcat Helpdesk — Device Report"]).font = {
    size: 11,
    color: { argb: "FF666666" },
  };
  sheet.addRow([]);

  const exportedAt = sheet.addRow([
    "วันที่ออกรายงาน (Exported)",
    new Date(),
  ]);
  exportedAt.getCell(2).numFmt = DATETIME_FORMAT;
  sheet.addRow(["จำนวนแถวในไฟล์นี้ (Rows exported)", exportedRows]);
  sheet.addRow([]);

  const heading = (text: string) => {
    const row = sheet.addRow([text]);
    row.font = { bold: true, size: 12 };
    return row;
  };

  heading("ภาพรวม (Overview)");
  const stats: [string, string | number | null][] = [
    ["อุปกรณ์ทั้งหมด (Total devices)", summary.total],
    ["คอมพิวเตอร์ (Computers)", summary.computers],
    ["อุปกรณ์อื่น (Other equipment)", summary.equipment],
    ["ออนไลน์ (Online)", summary.online],
    ["ออฟไลน์ (Offline)", summary.offline],
    ["อายุเฉลี่ย (Average age, years)", summary.averageAgeYears],
    [
      `ไม่ติดต่อตั้งแต่ ${staleThreshold(filters)} วัน (Stale agents)`,
      summary.staleAgents,
    ],
    ["ประกันหมดแล้ว (Warranty expired)", summary.warrantyExpired],
    [
      `ประกันหมดใน ${EXPIRING_SOON_DAYS} วัน (Expiring soon)`,
      summary.warrantyExpiring90,
    ],
    [
      "Windows ไม่ใช่เวอร์ชันล่าสุด (Outdated Windows)",
      summary.outdatedWindows,
    ],
    [
      "เวอร์ชัน Windows ล่าสุดในองค์กร (Newest in fleet)",
      summary.newestWindowsVersion,
    ],
  ];
  for (const [label, value] of stats) {
    sheet.addRow([label, value ?? "—"]);
  }
  sheet.addRow([]);

  heading("ตัวกรองที่ใช้ (Filters applied)");
  const entries = Object.entries(filters).filter(
    ([, value]) => value !== undefined && (!Array.isArray(value) || value.length),
  );
  if (entries.length === 0) {
    sheet.addRow(["ไม่ได้กรอง — ข้อมูลทั้งหมด (No filters — full dataset)"]);
  } else {
    for (const [key, value] of entries) {
      sheet.addRow([FILTER_LABELS[key] ?? key, describeFilterValue(value)]);
    }
  }
  sheet.addRow([]);

  heading("หมายเหตุ (Notes)");
  for (const note of [
    "วันที่ในไฟล์เป็นคริสต์ศักราช เพื่อให้ Excel เรียงและกรองได้ถูกต้อง",
    "ช่องว่างหมายถึงไม่มีข้อมูลในระบบ Starcat",
    "ข้อมูล OS/แรม/ดิสก์ มีเฉพาะเครื่องที่ติดตั้ง Agent เท่านั้น",
  ]) {
    sheet.addRow([note]).font = { size: 10, color: { argb: "FF666666" } };
  }

  sheet.getColumn(1).alignment = { vertical: "middle" };
}

export type ExportInput = {
  devices: Device[];
  summary: Summary;
  filters: DeviceFilters;
  /** Reachable machines behind the newest Windows feature version. */
  outdated: Device[];
  /** Managed PCs long out of contact, or never seen at all. */
  stale: Device[];
};

export async function buildDeviceWorkbook({
  devices,
  summary,
  filters,
  outdated,
  stale,
}: ExportInput): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Starcat Dashboard";
  workbook.created = new Date();

  addSummarySheet(workbook, summary, filters, devices.length);
  addDataSheet(workbook, "อุปกรณ์ (Devices)", DEVICE_COLUMNS, devices);
  // One worksheet per work queue, matching the two tables on screen.
  addDataSheet(
    workbook,
    "ต้องอัพเดท (Needs Update)",
    OUTDATED_COLUMNS,
    outdated,
  );
  addDataSheet(workbook, "ไม่ได้ใช้งานนาน (Inactive)", STALE_COLUMNS, stale);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/** `รายงานอุปกรณ์_2026-08-13.xlsx`, safe for Content-Disposition. */
export function exportFilename(): string {
  const stamp = new Date().toISOString().slice(0, 10);
  return `starcat-devices-${stamp}.xlsx`;
}
