import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// Подхватываем .env / .env.local так же, как это делает Next.js
loadEnvConfig(process.cwd());

export default defineConfig({
  dialect: "mysql",
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
