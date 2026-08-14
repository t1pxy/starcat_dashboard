/**
 * The one place that knows how Starcat Helpdesk stores equipment.
 *
 * Everything else in the dashboard reads from `DEVICE_SOURCE`, a derived table
 * that flattens the Starcat schema into the columns of `Device`. If the
 * helpdesk is upgraded and tables move, this file is the only one to change.
 *
 * Verified against StarCat10 — every join key below is unique in its table, so
 * the LEFT JOINs cannot multiply rows (789 devices in, 789 rows out).
 *
 *   TB_SYSTEMDEVICE  hub, one row per device (AgentID)
 *   TB_ORGANIZATION  org name                    (OrgID)
 *   TB_USER          owner, and the ONLY reliable source of department and
 *                    location — TB_SYSTEMDEVICE.DEP_ID/LOCATION_ID are unused
 *                    in this database (2 and 0 rows populated respectively)
 *   TB_INV_*         hardware/OS inventory for the 242 managed PCs
 *   TB_COMPUTER      agent state: last check-in, antivirus, Office
 *   TB_EQUIPMENT     the 308 non-PC assets, typed via TB_EQUIPMENTTYPE
 *   TB_CONTRACT      lease/warranty end date, linked by TB_CONTRACT_ASSET
 */

/**
 * Placeholder junk — OEM strings baked into SMBIOS, plus Starcat's own
 * "Unassigned" sentinel. Treated as NULL so none of it shows up as a real
 * brand, model, or owner in the dashboard or the Excel export.
 */
const PLACEHOLDERS = [
  "",
  "System Product Name",
  "System Serial Number",
  "System manufacturer",
  "To Be Filled By O.E.M.",
  "Default string",
  "None",
  "N/A",
  "NA",
  "Unknown",
  "Unassigned",
  "null",
  "0",
] as const;

const PLACEHOLDER_LIST = PLACEHOLDERS.map((value) => `'${value}'`).join(", ");

/** Trims a column and nulls out OEM placeholder text. */
function scrub(column: string): string {
  return `NULLIF(CASE WHEN LTRIM(RTRIM(${column})) IN (${PLACEHOLDER_LIST}) THEN NULL ELSE LTRIM(RTRIM(${column})) END, '')`;
}

/**
 * Collapses vendor spellings onto one label so "ASUSTeK COMPUTER INC." and
 * "ASUS" don't split into two slices of the same pie chart.
 */
const BRAND = `
  CASE
    WHEN sys.Manufacturer LIKE 'ASUS%'                                      THEN 'ASUS'
    WHEN sys.Manufacturer LIKE 'HP%' OR sys.Manufacturer LIKE 'Hewlett%'    THEN 'HP'
    WHEN sys.Manufacturer LIKE 'Dell%'                                      THEN 'Dell'
    WHEN sys.Manufacturer LIKE 'Lenovo%'                                    THEN 'Lenovo'
    WHEN sys.Manufacturer LIKE 'Acer%'                                      THEN 'Acer'
    WHEN sys.Manufacturer LIKE 'Micro-Star%' OR sys.Manufacturer LIKE 'MSI%' THEN 'MSI'
    WHEN sys.Manufacturer LIKE 'Giga-Byte%' OR sys.Manufacturer LIKE 'Gigabyte%' THEN 'Gigabyte'
    WHEN sys.Manufacturer LIKE 'Apple%'                                     THEN 'Apple'
    WHEN sys.Manufacturer LIKE 'Microsoft%'                                 THEN 'Microsoft'
    WHEN sys.Manufacturer LIKE 'Samsung%'                                   THEN 'Samsung'
    WHEN sys.Manufacturer LIKE 'Fujitsu%'                                   THEN 'Fujitsu'
    WHEN sys.Manufacturer LIKE 'Toshiba%'                                   THEN 'Toshiba'
    WHEN sys.Manufacturer LIKE 'Intel%'                                     THEN 'Intel'
    ELSE COALESCE(${scrub("sys.Manufacturer")}, ${scrub("eq.Manufacturer")})
  END`;

/**
 * "Last seen" means the most recent sign of life from any channel: the device
 * ping, the hardware inventory sweep, or the software inventory sweep.
 *
 * Computed once per row via CROSS APPLY (see `ls` below) rather than inlined —
 * it is needed three times in the SELECT list, and repeating the subquery made
 * SQL Server evaluate it three times per row.
 */
const LAST_SEEN = "ls.lastSeen";

/**
 * The flattened device table. Wrap it as `FROM (${DEVICE_SOURCE}) AS dev`.
 *
 * `newestWindowsVersion` is derived from the fleet itself rather than
 * hardcoded, so when Microsoft ships 26H1 and the first PC picks it up, every
 * other PC is flagged as behind automatically. Feature versions use a YYHN
 * naming scheme, so a plain string MAX orders them correctly.
 */
export const DEVICE_SOURCE = `
SELECT
  d.AgentID                                             AS agentId,
  COALESCE(${scrub("d.DeviceName")}, ${scrub("eq.DeviceName")}, ${scrub("d.Alias")}) AS deviceName,
  ${scrub("d.AssetNumber")}                             AS assetNumber,
  COALESCE(${scrub("d.DeviceType")}, 'UNKNOWN')         AS deviceType,
  CASE
    WHEN d.DeviceType = 'COMPUTER' THEN N'Computer'
    ELSE COALESCE(${scrub("eqt.EquipmentType")}, ${scrub("d.DeviceType")})
  END                                                   AS category,
  ${BRAND}                                              AS brand,
  COALESCE(${scrub("sys.Model")}, ${scrub("eq.Model")}) AS model,
  COALESCE(${scrub("comp.SerialNumber")}, ${scrub("sys.Serial")}, ${scrub("eq.SerialNumber")}) AS serialNumber,
  COALESCE(${scrub("d.IPAddress")}, ${scrub("eq.IPAddress")}) AS ipAddress,
  ${scrub("d.MACAddress")}                              AS macAddress,
  CAST(CASE WHEN d.OnlineStatus = 'True' THEN 1 ELSE 0 END AS bit) AS online,

  ${scrub("dep.DEPNAME")}                               AS department,
  ${scrub("loc.LOCATIONNAME")}                          AS location,
  -- loc.BUILDING / loc.FLOOR / loc.Room, d.AssetHolder and comp.AvNAME are
  -- omitted on purpose: all five are empty for every row in this database.

  ${scrub("d.OwnerID")}                                 AS ownerId,
  ${scrub(
    "LTRIM(RTRIM(ISNULL(u.FIRSTNAME, '') + ' ' + ISNULL(u.LASTNAME, '')))",
  )}                                                    AS ownerName,
  ${scrub("u.EMAIL")}                                   AS ownerEmail,

  d.BuyDate                                             AS buyDate,
  CASE
    WHEN d.BuyDate IS NULL THEN NULL
    ELSE ROUND(DATEDIFF(day, d.BuyDate, GETDATE()) / 365.25, 1)
  END                                                   AS ageYears,
  ct.EndDate                                            AS warrantyEnd,
  CASE
    WHEN ct.EndDate IS NULL THEN NULL
    ELSE DATEDIFF(day, GETDATE(), ct.EndDate)
  END                                                   AS warrantyDaysLeft,
  ${scrub("ct.ContractName")}                           AS contractName,

  ${LAST_SEEN}                                          AS lastSeen,
  CASE
    WHEN ${LAST_SEEN} IS NULL THEN NULL
    ELSE DATEDIFF(day, ${LAST_SEEN}, GETDATE())
  END                                                   AS daysSinceSeen,

  ${scrub("os.VersionFull")}                            AS osName,
  ${scrub("os.Windows_Version")}                        AS windowsVersion,
  ${scrub("os.Build")}                                  AS osBuild,
  -- The revision after the dot in 26200.8973. Without it the build number only
  -- identifies the feature version, and every 25H2 machine looks equally
  -- patched whether it took last week's update or February's.
  ${scrub("os.UBR")}                                    AS osUbr,
  os.InstallDate                                        AS osInstallDate,
  ${scrub("comp.OfficeVersion")}                        AS officeVersion,
  comp.LastSoftwareUpdate                               AS lastSoftwareUpdate,

  CASE WHEN mac.TotalMemory  > 0 THEN ROUND(mac.TotalMemory  / 1024.0, 1) END AS memoryGb,
  CASE WHEN mac.TotalStorage > 0 THEN ROUND(mac.TotalStorage / 1024.0, 1) END AS storageGb,
  mac.LastBoot                                          AS lastBoot,
  ${scrub("comp.AgentVersion")}                         AS agentVersion,
  ${scrub("comp.LogonUser")}                            AS logonUser,

  newest.windowsVersion                                 AS newestWindowsVersion
FROM TB_SYSTEMDEVICE d
-- TB_ORGANIZATION is deliberately not joined: every one of the 789 devices
-- points at the single "Unassigned" org, so the column carries no information.
-- Must join on the *scrubbed* owner id. TB_USER contains a real employee whose
-- USER_ID is literally 'Unassigned', and 469 devices carry that sentinel as
-- their OwnerID — joining raw would credit a third of the fleet, plus its
-- department and location, to that one person.
LEFT JOIN TB_USER          u   ON u.USER_ID           = ${scrub("d.OwnerID")}
LEFT JOIN TB_DEPARTMENT    dep ON dep.DEP_ID          = u.DEP_ID
LEFT JOIN TB_LOCATION      loc ON loc.LOCATION_ID     = u.LOCATION_ID
LEFT JOIN TB_INV_SYSTEM    sys ON sys.AgentID         = d.AgentID
LEFT JOIN TB_INV_OS        os  ON os.AgentID          = d.AgentID
LEFT JOIN TB_INV_MACHINE   mac ON mac.AgentID         = d.AgentID
LEFT JOIN TB_COMPUTER      comp ON comp.AgentID       = d.AgentID
LEFT JOIN TB_EQUIPMENT     eq  ON eq.AgentID          = d.AgentID
LEFT JOIN TB_EQUIPMENTTYPE eqt ON eqt.EquipmentTypeID = eq.EquipmentTypeID
CROSS APPLY (
  SELECT MAX(seen) AS lastSeen FROM (VALUES
    (d.LastRespond), (comp.LastHardwareUpdate), (comp.LastSoftwareUpdate)
  ) AS t(seen)
) ls
OUTER APPLY (
  SELECT TOP 1 c.ContractName, c.EndDate
  FROM TB_CONTRACT_ASSET ca
  JOIN TB_CONTRACT c ON c.ContractID = ca.ContactID
  WHERE ca.AssectID = d.AgentID
  ORDER BY c.EndDate DESC
) ct
CROSS JOIN (
  SELECT MAX(${scrub("Windows_Version")}) AS windowsVersion FROM TB_INV_OS
) newest
`;
