import type { Dimension } from "./dimensions";

/** One row of the device dashboard, already flattened and cleaned. */
export type Device = {
  agentId: string;
  deviceName: string | null;
  assetNumber: string | null;
  /** COMPUTER | Equipment | UNKNOWN | UNMANAGED — the raw Starcat classification. */
  deviceType: string;
  /** Equipment sub-type (Printer, Keyboard, …) or "Computer" for managed PCs. */
  category: string | null;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  ipAddress: string | null;
  macAddress: string | null;
  online: boolean;

  department: string | null;
  location: string | null;

  ownerId: string | null;
  ownerName: string | null;
  ownerEmail: string | null;

  buyDate: string | null;
  /** Whole + fractional years since `buyDate`, rounded to 1 decimal. */
  ageYears: number | null;
  warrantyEnd: string | null;
  /** Negative once the warranty/lease has already lapsed. */
  warrantyDaysLeft: number | null;
  contractName: string | null;

  lastSeen: string | null;
  daysSinceSeen: number | null;

  osName: string | null;
  windowsVersion: string | null;
  osBuild: string | null;
  /** Revision within the build — the "8973" of 26200.8973. */
  osUbr: string | null;
  osInstallDate: string | null;
  officeVersion: string | null;
  lastSoftwareUpdate: string | null;

  memoryGb: number | null;
  storageGb: number | null;
  lastBoot: string | null;
  agentVersion: string | null;
  logonUser: string | null;
};

/**
 * What the dashboard is looking at.
 *
 * Monitoring is about machines you can patch and reach, so the dashboard scopes
 * itself to computers — desktops and laptops — by default. Printers, keyboards
 * and the rest of the equipment register have no OS, no agent and no contact
 * history, so they can only ever dilute a health chart. `"all"` widens the view
 * back out to the full asset register for inventory work.
 */
export type DeviceScope = "computers" | "all";

/**
 * Every filter is optional; an absent key means "ไม่กรอง" (no restriction).
 *
 * The seven dimension filters are derived from `DIMENSIONS` rather than listed
 * again, so a dimension cannot exist in the SQL layer without also being
 * accepted here — each one accepts a list of values, matched with `IN (…)`.
 */
export type DeviceFilters = Partial<Record<Dimension, string[]>> & {
  /** Absent means the computers-only default. */
  scope?: DeviceScope;
  search?: string;
  online?: "true" | "false";
  /** Devices whose warranty ends within N days (negative = already expired). */
  warrantyWithinDays?: number;
  /** Devices not seen for at least N days. */
  staleDays?: number;
  /** Only devices running an older Windows feature version than the newest seen. */
  outdatedOnly?: boolean;
  minAgeYears?: number;
};

export type FacetValue = { value: string; count: number };

/** One list of dropdown options per dimension — always all seven, so the filter
 *  bar can render itself straight from `DIMENSIONS`. */
export type Facets = Record<Dimension, FacetValue[]>;

export type Summary = {
  total: number;
  online: number;
  offline: number;
  computers: number;
  equipment: number;
  /** Managed PCs behind the newest Windows feature version in the fleet. */
  outdatedWindows: number;
  /** Devices with no contact for 30+ days. */
  staleAgents: number;
  warrantyExpired: number;
  warrantyExpiring90: number;
  /** Mean device age in years across rows that have a purchase date. */
  averageAgeYears: number | null;
  /** Newest Windows feature version observed, used as the update target. */
  newestWindowsVersion: string | null;
};

export type Breakdown = { label: string; count: number };

/** One department's fleet, and how much of it needs attention. */
export type DepartmentHealth = {
  department: string;
  total: number;
  online: number;
  offline: number;
  /** Behind the newest Windows feature version in the fleet. */
  outdated: number;
  /** Managed PCs out of contact, or never seen. */
  stale: number;
};

/** Bucket counts keyed by bucket id, e.g. `{ ok: 180, slow: 12, never: 3 }`. */
export type BucketCounts = Record<string, number>;

export type Distributions = {
  contact: BucketCounts;
  warranty: BucketCounts;
  windows: BucketCounts;
  age: BucketCounts;
};

/** What the device-name scheme reveals about the fleet's composition. */
export type FleetComposition = {
  ownership: { owned: number; leased: number };
  formFactor: { desktop: number; laptop: number };
  /** Devices per purchase year (ค.ศ.), oldest first. */
  byYear: { year: number; owned: number; leased: number }[];
  /** Devices whose name does not follow the scheme and could not be decoded. */
  undecoded: number;
};

export type DeviceSort = {
  column: keyof Device;
  direction: "asc" | "desc";
};
