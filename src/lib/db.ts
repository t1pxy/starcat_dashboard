import sql from "mssql";

/**
 * A single connection pool shared by every request.
 *
 * `next dev` re-evaluates modules on hot reload, which would otherwise leak a
 * new pool (and its sockets) on every edit, so the pool is parked on
 * `globalThis`.
 */
const globalForDb = globalThis as unknown as {
  starcatPool?: Promise<sql.ConnectionPool>;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `ไม่พบค่า environment variable \`${name}\` — คัดลอก .env.example ไปเป็น .env.local แล้วกรอกข้อมูลการเชื่อมต่อ MSSQL ให้ครบ`,
    );
  }
  return value;
}

function readConfig(): sql.config {
  const instanceName = process.env.MSSQL_INSTANCE?.trim();

  return {
    server: requireEnv("MSSQL_SERVER"),
    database: requireEnv("MSSQL_DATABASE"),
    user: requireEnv("MSSQL_USER"),
    password: requireEnv("MSSQL_PASSWORD"),
    // A named instance is resolved by the SQL Browser service, which picks the
    // port itself, so `port` must be omitted in that case.
    ...(instanceName
      ? {}
      : { port: Number(process.env.MSSQL_PORT ?? 1433) }),
    options: {
      ...(instanceName ? { instanceName } : {}),
      encrypt: process.env.MSSQL_ENCRYPT !== "false",
      trustServerCertificate:
        process.env.MSSQL_TRUST_SERVER_CERTIFICATE !== "false",
      // Helpdesk databases are usually Thai-collated; keep dates as JS Dates
      // rather than strings so formatting stays in our control.
      useUTC: false,
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30_000,
    },
    requestTimeout: 60_000,
    connectionTimeout: 15_000,
  };
}

export function getPool(): Promise<sql.ConnectionPool> {
  if (!globalForDb.starcatPool) {
    globalForDb.starcatPool = new sql.ConnectionPool(readConfig())
      .connect()
      .catch((error: unknown) => {
        // Drop the rejected promise so the next request retries instead of
        // re-throwing the same stale failure forever.
        globalForDb.starcatPool = undefined;
        throw error;
      });
  }
  return globalForDb.starcatPool;
}

export type QueryParam = {
  name: string;
  type: sql.ISqlType | (() => sql.ISqlType);
  value: unknown;
};

/**
 * Runs a parameterised query. Every value reaching SQL Server goes through
 * `request.input`, so filter values are never concatenated into the statement.
 */
export async function query<T extends Record<string, unknown>>(
  statement: string,
  params: QueryParam[] = [],
): Promise<T[]> {
  const pool = await getPool();
  const request = pool.request();
  for (const param of params) {
    request.input(param.name, param.type, param.value);
  }
  const result = await request.query<T>(statement);
  return result.recordset ?? [];
}

/**
 * Runs a multi-statement batch and returns every result set in order.
 *
 * The dashboard uses this to materialise the flattened device set into a
 * `#temp` table once and then read summary, breakdowns, page and export off
 * it — one round trip, and the expensive ten-way join is evaluated a single
 * time instead of once per question. A `#temp` table is scoped to the
 * connection, and a batch always runs on one connection, so the pool cannot
 * split these statements apart.
 */
export async function queryBatch(
  statement: string,
  params: QueryParam[] = [],
): Promise<Record<string, unknown>[][]> {
  const pool = await getPool();
  const request = pool.request();
  for (const param of params) {
    request.input(param.name, param.type, param.value);
  }
  const result = await request.query(statement);
  return result.recordsets as unknown as Record<string, unknown>[][];
}

export { sql };
