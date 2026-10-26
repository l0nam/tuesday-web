import { loadEnvConfig } from "@next/env";
import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";

loadEnvConfig(process.cwd());

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is missing. Run this script through Vercel env run or configure it in your local env.",
    );
  }

  const target = new URL(databaseUrl);
  const databaseName = decodeURIComponent(target.pathname.replace(/^\/+/, ""));
  console.log(`Migration target: ${target.hostname}/${databaseName}`);

  const connection = await mysql.createConnection(databaseUrl);
  try {
    console.log("Connected to the configured MySQL/MariaDB database.");
    await migrate(drizzle(connection), { migrationsFolder: "./drizzle" });
    console.log("Database migrations completed successfully.");
  } finally {
    await connection.end();
  }
}

main().catch((error: unknown) => {
  console.error("Database migration failed with the following error:");
  if (error instanceof Error) {
    console.error(error.stack ?? error.message);
    const cause = (error as Error & { cause?: unknown }).cause;
    if (cause) console.error("Cause:", cause);
  } else {
    console.error(error);
  }
  process.exitCode = 1;
});
