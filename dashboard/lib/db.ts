import "server-only";

import type { RowDataPacket } from "mysql2";
import mysql from "mysql2/promise";

export type DbParam = string | number | boolean | Date | null;
export type DbRow = RowDataPacket & Record<string, unknown>;

const databaseUrl = process.env.TIDB_DATABASE_URL ?? process.env.DATABASE_URL;

export function hasDatabaseConnection() {
  return Boolean(databaseUrl);
}

export function quoteIdentifier(identifier: string) {
  if (!/^[A-Za-z0-9_]+$/.test(identifier)) {
    throw new Error(`Unsafe SQL identifier: ${identifier}`);
  }
  return `\`${identifier}\``;
}

export async function queryRows<TRow extends RowDataPacket>(
  sql: string,
  params: DbParam[] = [],
): Promise<TRow[]> {
  if (!databaseUrl) {
    throw new Error("Database connection string is not configured.");
  }

  const connection = await mysql.createConnection({
    uri: databaseUrl,
    ssl: { rejectUnauthorized: true },
  });
  try {
    const [rows] = await connection.query<TRow[]>(sql, params);
    return rows;
  } finally {
    await connection.end();
  }
}

export async function executeQuery(sql: string, params: DbParam[] = []): Promise<void> {
  if (!databaseUrl) {
    throw new Error("Database connection string is not configured.");
  }

  const connection = await mysql.createConnection({
    uri: databaseUrl,
    ssl: { rejectUnauthorized: true },
  });
  try {
    await connection.query(sql, params);
  } finally {
    await connection.end();
  }
}
