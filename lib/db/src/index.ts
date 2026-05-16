import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = mysql.createPool(process.env.DATABASE_URL);
export const db = drizzle(pool, { schema, mode: "default" });

/**
 * Executa um INSERT na mesma conexão e lê `LAST_INSERT_ID()` nela.
 * Evita race do pool (insert numa conexão e `LAST_INSERT_ID()` noutra).
 * Drizzle + mysql2 também nem sempre expõe `insertId` no retorno do `.insert()`.
 */
export async function runInsertWithLastId(
  fn: (dbi: typeof db) => Promise<void>,
): Promise<number> {
  const conn = await pool.getConnection();
  try {
    const dbi = drizzle(conn, { schema, mode: "default" });
    await fn(dbi);
    const [rows] = await conn.query<Array<{ id: number }>>(
      "SELECT LAST_INSERT_ID() AS id",
    );
    const id = Number((rows as { id: number }[])[0]?.id);
    if (!Number.isFinite(id) || id <= 0) {
      throw new Error("Falha ao obter LAST_INSERT_ID");
    }
    return id;
  } finally {
    conn.release();
  }
}

export * from "./schema";
