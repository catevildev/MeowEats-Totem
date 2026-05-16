import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

/**
 * Um único ficheiro com mysqlTable evita falhas do drizzle-kit no Windows
 * ("No schema files found") com vários .ts encadeados.
 */
export default defineConfig({
  schema: "./src/schema/models.ts",
  dialect: "mysql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
