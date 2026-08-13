/**
 * Dumps the shape of the Starcat Helpdesk database so the dashboard's column
 * mapping (src/lib/devices/schema.ts) can be pointed at the real tables.
 *
 *   pnpm db:introspect
 *
 * Reads connection settings from .env.local. Writes a human-readable report to
 * db-introspect.md and the raw structure to db-introspect.json (both
 * gitignored, because sample rows contain real asset data).
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sql from "mssql";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Minimal .env parser — enough for KEY=value files, no dotenv dependency. */
function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    const path = resolve(projectRoot, file);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/i.exec(line);
      if (!match) continue;
      const [, key, rawValue] = match;
      if (process.env[key] !== undefined) continue;
      process.env[key] = rawValue.trim().replace(/^["'](.*)["']$/, "$1");
    }
  }
}

/** Tables whose names hint they hold equipment/asset records. */
const DEVICE_HINTS = [
  "asset",
  "device",
  "equipment",
  "hardware",
  "inventory",
  "computer",
  "machine",
  "notebook",
  "pc",
  "item",
];

/** Column names that usually carry secrets — never printed in sample rows. */
const SENSITIVE = /pass|pwd|secret|token|hash|salt|apikey|api_key/i;

function scoreTable(name) {
  const lower = name.toLowerCase();
  return DEVICE_HINTS.reduce(
    (score, hint) => (lower.includes(hint) ? score + 1 : score),
    0,
  );
}

function maskRow(row) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => {
      if (SENSITIVE.test(key)) return [key, "***"];
      if (value instanceof Date) return [key, value.toISOString()];
      if (Buffer.isBuffer(value)) return [key, `<binary ${value.length}b>`];
      if (typeof value === "string" && value.length > 120) {
        return [key, `${value.slice(0, 120)}…`];
      }
      return [key, value];
    }),
  );
}

async function main() {
  loadEnv();

  const instanceName = process.env.MSSQL_INSTANCE?.trim();
  const pool = await new sql.ConnectionPool({
    server: process.env.MSSQL_SERVER,
    database: process.env.MSSQL_DATABASE,
    user: process.env.MSSQL_USER,
    password: process.env.MSSQL_PASSWORD,
    ...(instanceName ? {} : { port: Number(process.env.MSSQL_PORT ?? 1433) }),
    options: {
      ...(instanceName ? { instanceName } : {}),
      encrypt: process.env.MSSQL_ENCRYPT !== "false",
      trustServerCertificate:
        process.env.MSSQL_TRUST_SERVER_CERTIFICATE !== "false",
    },
    connectionTimeout: 15_000,
    requestTimeout: 120_000,
  }).connect();

  console.log(
    `เชื่อมต่อสำเร็จ: ${process.env.MSSQL_SERVER}/${process.env.MSSQL_DATABASE}\n`,
  );

  // Row counts come from sys.partitions (instant) rather than COUNT(*) per
  // table, which would take minutes on a large helpdesk database.
  const { recordset: tables } = await pool.request().query(`
    SELECT
      s.name                AS [schema],
      t.name                AS [table],
      SUM(CASE WHEN p.index_id IN (0, 1) THEN p.rows ELSE 0 END) AS [rows]
    FROM sys.tables t
    JOIN sys.schemas s    ON s.schema_id = t.schema_id
    JOIN sys.partitions p ON p.object_id = t.object_id
    GROUP BY s.name, t.name
    ORDER BY [rows] DESC
  `);

  const { recordset: columns } = await pool.request().query(`
    SELECT
      TABLE_SCHEMA          AS [schema],
      TABLE_NAME            AS [table],
      COLUMN_NAME           AS [column],
      DATA_TYPE             AS [type],
      CHARACTER_MAXIMUM_LENGTH AS [maxLength],
      IS_NULLABLE           AS [nullable],
      ORDINAL_POSITION      AS [position]
    FROM INFORMATION_SCHEMA.COLUMNS
    ORDER BY TABLE_SCHEMA, TABLE_NAME, ORDINAL_POSITION
  `);

  const columnsByTable = new Map();
  for (const column of columns) {
    const key = `${column.schema}.${column.table}`;
    if (!columnsByTable.has(key)) columnsByTable.set(key, []);
    columnsByTable.get(key).push(column);
  }

  // Rank candidates by name hint first, row count second: the real device
  // table is almost always both plausibly named and well populated.
  const candidates = tables
    .map((table) => ({ ...table, score: scoreTable(table.table) }))
    .filter((table) => table.score > 0 && table.rows > 0)
    .sort((a, b) => b.score - a.score || b.rows - a.rows)
    .slice(0, 12);

  const samples = {};
  for (const candidate of candidates) {
    const key = `${candidate.schema}.${candidate.table}`;
    try {
      const { recordset } = await pool
        .request()
        .query(`SELECT TOP 3 * FROM [${candidate.schema}].[${candidate.table}]`);
      samples[key] = recordset.map(maskRow);
    } catch (error) {
      samples[key] = { error: String(error.message ?? error) };
    }
  }

  const report = {
    server: process.env.MSSQL_SERVER,
    database: process.env.MSSQL_DATABASE,
    generatedAt: new Date().toISOString(),
    tables,
    columnsByTable: Object.fromEntries(columnsByTable),
    deviceTableCandidates: candidates,
    samples,
  };

  writeFileSync(
    resolve(projectRoot, "db-introspect.json"),
    JSON.stringify(report, null, 2),
    "utf8",
  );

  const lines = [
    `# Starcat Helpdesk — DB structure`,
    ``,
    `Server: \`${report.server}\` · Database: \`${report.database}\``,
    `Generated: ${report.generatedAt}`,
    ``,
    `## ตารางที่น่าจะเก็บข้อมูลอุปกรณ์ (device table candidates)`,
    ``,
    `| Table | Rows | Columns |`,
    `| --- | ---: | --- |`,
    ...candidates.map((candidate) => {
      const key = `${candidate.schema}.${candidate.table}`;
      const cols = columnsByTable.get(key) ?? [];
      return `| \`${key}\` | ${candidate.rows} | ${cols.length} |`;
    }),
    ``,
    `## คอลัมน์ของตารางที่น่าสนใจ`,
    ``,
  ];

  for (const candidate of candidates) {
    const key = `${candidate.schema}.${candidate.table}`;
    const cols = columnsByTable.get(key) ?? [];
    lines.push(`### \`${key}\` — ${candidate.rows} rows`, ``);
    lines.push(`| # | Column | Type | Null |`, `| ---: | --- | --- | --- |`);
    for (const col of cols) {
      const type = col.maxLength
        ? `${col.type}(${col.maxLength === -1 ? "max" : col.maxLength})`
        : col.type;
      lines.push(
        `| ${col.position} | \`${col.column}\` | ${type} | ${col.nullable} |`,
      );
    }
    lines.push(``, `<details><summary>ตัวอย่างข้อมูล 3 แถว</summary>`, ``);
    lines.push("```json", JSON.stringify(samples[key], null, 2), "```");
    lines.push(`</details>`, ``);
  }

  lines.push(
    `## ตารางทั้งหมดในฐานข้อมูล`,
    ``,
    `| Table | Rows |`,
    `| --- | ---: |`,
    ...tables.map((t) => `| \`${t.schema}.${t.table}\` | ${t.rows} |`),
    ``,
  );

  writeFileSync(
    resolve(projectRoot, "db-introspect.md"),
    lines.join("\n"),
    "utf8",
  );

  console.log(`ตารางทั้งหมด: ${tables.length}`);
  console.log(`ตารางที่น่าจะเป็นข้อมูลอุปกรณ์:`);
  for (const candidate of candidates) {
    console.log(
      `  - ${candidate.schema}.${candidate.table} (${candidate.rows} rows)`,
    );
  }
  console.log(`\nเขียนรายงานแล้ว: db-introspect.md, db-introspect.json`);

  await pool.close();
}

main().catch((error) => {
  console.error(`\nเชื่อมต่อ/อ่านข้อมูลไม่สำเร็จ:\n${error.message ?? error}`);
  process.exitCode = 1;
});
