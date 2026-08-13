import type { Device } from "./types";

/**
 * The column catalogue shared by the on-screen table and the Excel export, so
 * what you see is exactly what you get in the file.
 *
 * Headers are bilingual: Thai label with the English/technical name beside it,
 * which is how the helpdesk team refers to these fields in practice.
 *
 * Columns deliberately excluded from the export:
 *   agentId              internal GUID, meaningless to a reader
 *   newestWindowsVersion a computed constant, reported in the summary instead
 * Columns dropped from the model entirely because this database never fills
 * them: building, floor, room, assetHolder, antivirus.
 */
export type ColumnKind = "text" | "date" | "datetime" | "number" | "boolean";

export type DeviceColumn = {
  key: keyof Device;
  /** Thai label shown in the UI. */
  label: string;
  /** English/technical name, shown under the Thai label. */
  english: string;
  kind: ColumnKind;
  /** Excel column width in characters. */
  width: number;
  /** Only meaningful for the 242 managed PCs. */
  computerOnly?: boolean;
};

export const DEVICE_COLUMNS: DeviceColumn[] = [
  { key: "deviceName", label: "ชื่อเครื่อง", english: "Device Name", kind: "text", width: 20 },
  { key: "assetNumber", label: "เลขครุภัณฑ์", english: "Asset No.", kind: "text", width: 16 },
  { key: "deviceType", label: "ประเภท", english: "Type", kind: "text", width: 14 },
  { key: "category", label: "หมวดหมู่", english: "Category", kind: "text", width: 14 },
  { key: "brand", label: "ยี่ห้อ", english: "Brand", kind: "text", width: 12 },
  { key: "model", label: "รุ่น", english: "Model", kind: "text", width: 30 },
  { key: "serialNumber", label: "ซีเรียล", english: "Serial Number", kind: "text", width: 20 },

  { key: "ownerName", label: "ผู้ถือครอง", english: "Owner", kind: "text", width: 22 },
  { key: "ownerId", label: "รหัสผู้ใช้", english: "User ID", kind: "text", width: 16 },
  { key: "ownerEmail", label: "อีเมล", english: "Email", kind: "text", width: 26 },
  { key: "department", label: "หน่วยงาน", english: "Department", kind: "text", width: 16 },
  { key: "location", label: "สถานที่", english: "Location", kind: "text", width: 12 },

  { key: "online", label: "ออนไลน์", english: "Online", kind: "boolean", width: 10 },
  { key: "ipAddress", label: "ไอพี", english: "IP Address", kind: "text", width: 16 },
  { key: "macAddress", label: "แมค", english: "MAC Address", kind: "text", width: 16 },

  { key: "buyDate", label: "วันที่ซื้อ", english: "Purchase Date", kind: "date", width: 13 },
  { key: "ageYears", label: "อายุ (ปี)", english: "Age (years)", kind: "number", width: 10 },
  { key: "warrantyEnd", label: "วันหมดประกัน", english: "Warranty End", kind: "date", width: 14 },
  { key: "warrantyDaysLeft", label: "คงเหลือ (วัน)", english: "Days Left", kind: "number", width: 12 },
  { key: "contractName", label: "สัญญา", english: "Contract", kind: "text", width: 32 },

  { key: "lastSeen", label: "ติดต่อล่าสุด", english: "Last Seen", kind: "datetime", width: 18 },
  { key: "daysSinceSeen", label: "ไม่ติดต่อ (วัน)", english: "Days Since Seen", kind: "number", width: 14 },

  { key: "osName", label: "ระบบปฏิบัติการ", english: "OS", kind: "text", width: 26, computerOnly: true },
  { key: "windowsVersion", label: "เวอร์ชัน Windows", english: "Windows Version", kind: "text", width: 15, computerOnly: true },
  { key: "osBuild", label: "บิลด์", english: "Build", kind: "text", width: 10, computerOnly: true },
  { key: "osUbr", label: "รีวิชัน", english: "Revision (UBR)", kind: "text", width: 10, computerOnly: true },
  { key: "osInstallDate", label: "วันติดตั้ง OS", english: "OS Installed", kind: "date", width: 13, computerOnly: true },
  { key: "lastSoftwareUpdate", label: "อัพเดทซอฟต์แวร์ล่าสุด", english: "Last SW Update", kind: "datetime", width: 18, computerOnly: true },
  { key: "officeVersion", label: "เวอร์ชัน Office", english: "Office Version", kind: "text", width: 14, computerOnly: true },
  { key: "lastBoot", label: "บูตล่าสุด", english: "Last Boot", kind: "datetime", width: 18, computerOnly: true },

  { key: "memoryGb", label: "แรม (GB)", english: "RAM (GB)", kind: "number", width: 11, computerOnly: true },
  { key: "storageGb", label: "ดิสก์ (GB)", english: "Storage (GB)", kind: "number", width: 12, computerOnly: true },
  { key: "agentVersion", label: "เวอร์ชัน Agent", english: "Agent Version", kind: "text", width: 14, computerOnly: true },
  { key: "logonUser", label: "ผู้ล็อกอิน", english: "Logon User", kind: "text", width: 16, computerOnly: true },
];

/** The compact set shown in the on-screen table; the rest live in the export. */
export const TABLE_COLUMN_KEYS: (keyof Device)[] = [
  "deviceName",
  "category",
  "brand",
  "model",
  "ownerName",
  "department",
  "location",
  "ageYears",
  "warrantyEnd",
  "lastSeen",
  "windowsVersion",
  "online",
];

export const TABLE_COLUMNS = TABLE_COLUMN_KEYS.map(
  (key) => DEVICE_COLUMNS.find((column) => column.key === key)!,
);

/**
 * The two work queues are separate tables — and separate worksheets — because
 * they are separate jobs: one is "patch this machine", the other is "find out
 * where this machine went". Each carries only the columns its job needs, which
 * is also what lets both fit on screen without sideways scrolling.
 */
export const OUTDATED_COLUMN_KEYS: (keyof Device)[] = [
  "deviceName",
  "ownerName",
  "department",
  "location",
  "windowsVersion",
  "osBuild",
  "lastSoftwareUpdate",
  "lastSeen",
];

export const OUTDATED_COLUMNS = OUTDATED_COLUMN_KEYS.map(
  (key) => DEVICE_COLUMNS.find((column) => column.key === key)!,
);

export const STALE_COLUMN_KEYS: (keyof Device)[] = [
  "deviceName",
  "ownerName",
  "department",
  "location",
  "osName",
  "lastSeen",
  "daysSinceSeen",
];

export const STALE_COLUMNS = STALE_COLUMN_KEYS.map(
  (key) => DEVICE_COLUMNS.find((column) => column.key === key)!,
);

/**
 * The full record, grouped for the panel that opens when a row is clicked.
 *
 * A table row can only carry a dozen columns before it stops being readable, so
 * the other twenty fields used to exist solely inside the Excel export. This is
 * the same catalogue read a second way: one device at a time, every field it
 * has, grouped by the question it answers rather than by how wide it is.
 *
 * `deviceName` is absent on purpose — it is the panel's heading.
 */
export type DetailSection = {
  title: string;
  english: string;
  keys: (keyof Device)[];
};

export const DETAIL_SECTIONS: DetailSection[] = [
  {
    title: "อุปกรณ์",
    english: "Device",
    keys: ["assetNumber", "deviceType", "category", "brand", "model", "serialNumber"],
  },
  {
    title: "ผู้ถือครอง",
    english: "Owner",
    keys: ["ownerName", "ownerId", "ownerEmail", "department", "location"],
  },
  {
    title: "เครือข่าย",
    english: "Network",
    keys: ["online", "ipAddress", "macAddress"],
  },
  {
    title: "จัดซื้อและประกัน",
    english: "Purchase & warranty",
    keys: ["buyDate", "ageYears", "warrantyEnd", "warrantyDaysLeft", "contractName"],
  },
  {
    title: "การติดต่อ",
    english: "Contact",
    keys: ["lastSeen", "daysSinceSeen"],
  },
  {
    title: "ระบบปฏิบัติการ",
    english: "Operating system",
    keys: [
      "osName",
      "windowsVersion",
      "osBuild",
      "osUbr",
      "osInstallDate",
      "lastSoftwareUpdate",
      "officeVersion",
    ],
  },
  {
    title: "ฮาร์ดแวร์และ Agent",
    english: "Hardware & agent",
    keys: ["memoryGb", "storageGb", "lastBoot", "agentVersion", "logonUser"],
  },
];

/** Looks a column up by key, so the detail panel reuses the labels the table
 *  and the export already agree on. */
export function columnFor(key: keyof Device): DeviceColumn {
  return DEVICE_COLUMNS.find((column) => column.key === key)!;
}

/**
 * Column widths as CSS percentages of the table. Paired with `table-fixed`,
 * this is what lets a table lay every column out inside the viewport instead of
 * growing past it and forcing a horizontal scrollbar. The Excel widths are
 * reused as the ratio because they already encode how much room each field
 * actually needs.
 */
export function columnWidths(columns: DeviceColumn[]): string[] {
  const total = columns.reduce((sum, column) => sum + column.width, 0);
  return columns.map((column) => `${((column.width / total) * 100).toFixed(3)}%`);
}
