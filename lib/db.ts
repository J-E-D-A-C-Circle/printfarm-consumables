import mysql from "mysql2/promise";

declare global {
  // eslint-disable-next-line no-var
  var _mysqlPool: mysql.Pool | undefined;
}

function createPool() {
  return mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "dvla_user",
    password: process.env.DB_PASSWORD || "dvla_pass",
    database: process.env.DB_NAME || "dvla_consumables",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: "+00:00",
    dateStrings: true,
  });
}

// Singleton: reuse pool across hot-reloads in dev
const pool = globalThis._mysqlPool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  globalThis._mysqlPool = pool;
}

export { pool };

// Convenience wrapper — returns rows typed as T[]
export async function query<T = Record<string, unknown>>(
  sql: string,
  params?: any[]
): Promise<T[]> {
  const [rows] = await pool.execute(sql, params as any);
  return rows as T[];
}

// Single-row fetch
export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params?: any[]
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

// Execute (INSERT / UPDATE / DELETE) — returns ResultSetHeader
export async function execute(
  sql: string,
  params?: any[]
): Promise<mysql.ResultSetHeader> {
  const [result] = await pool.execute(sql, params as any);
  return result as mysql.ResultSetHeader;
}
