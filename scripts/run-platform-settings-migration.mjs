/**
 * Applies migration 0004_platform_settings.sql: creates the singleton
 * platform_settings table (id=1) used for platform-wide branding
 * (currently just the platform logo shown in DashboardNav).
 *
 * Safe to run multiple times (CREATE TABLE IF NOT EXISTS + ON CONFLICT DO NOTHING).
 *
 * Usage:
 *   node scripts/run-platform-settings-migration.mjs
 *
 * (DATABASE_URL is read from .env.local automatically)
 */

import postgres from "postgres";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env.local");

const env = {};
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
}

const sql = postgres(env.DATABASE_URL, { ssl: "require" });

const [{ exists: hasTable }] = await sql`
  select exists (
    select 1 from information_schema.tables where table_name = 'platform_settings'
  ) as exists
`;

if (hasTable) {
  console.log("platform_settings table already exists.");
} else {
  await sql`
    create table "platform_settings" (
      "id" integer primary key default 1,
      "logo_url" text,
      "updated_at" timestamp not null default now()
    )
  `;
  console.log("Created platform_settings table.");
}

await sql`
  insert into "platform_settings" ("id") values (1) on conflict ("id") do nothing
`;
console.log("Ensured singleton row (id=1) exists.");

await sql.end();
