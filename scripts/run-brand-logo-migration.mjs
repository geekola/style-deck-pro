/**
 * Applies migration 0003_brand_logo.sql: adds a logo_url column to the
 * brands table, used in the brand account "Branding" section and as a small
 * overlay badge on the brand's product images in the customer
 * discover/saved views.
 *
 * Safe to run multiple times (checks information_schema before altering).
 *
 * Usage:
 *   node scripts/run-brand-logo-migration.mjs
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

const [{ exists: hasColumn }] = await sql`
  select exists (
    select 1 from information_schema.columns
    where table_name = 'brands' and column_name = 'logo_url'
  ) as exists
`;

if (hasColumn) {
  console.log("brands.logo_url already exists.");
} else {
  await sql`alter table "brands" add column "logo_url" text`;
  console.log("Added brands.logo_url column.");
}

await sql.end();
