import { type Config } from "drizzle-kit";
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url)
  throw new Error(
    "Configure the experiment database before running migrations",
  );
export default {
  schema: "./src/server/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: { url },
  casing: "snake_case",
} satisfies Config;
