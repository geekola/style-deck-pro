/**
 * Brings the DB in line with schema.ts changes for brand admin polish:
 *   - brandStatusEnum gains a 'suspended' value (alongside pending/approved/rejected)
 *   - brands gains a nullable status_reason text column (rejection/suspension reason)
 *
 * Safe to run multiple times (checks before altering).
 *
 * Usage:
 *   node scripts/add-brand-status-fields.mjs
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

// 1. Add 'suspended' to brand_status enum, if not already present
const [{ exists: hasSuspended }] = await sql`
  select exists (
    select 1 from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'brand_status' and e.enumlabel = 'suspended'
  ) as exists
`;

if (hasSuspended) {
  console.log("brand_status already has 'suspended'.");
} else {
  await sql`alter type brand_status add value 'suspended'`;
  console.log("Added 'suspended' to brand_status enum.");
}

// 2. Add status_reason column to brands, if not already present
const [{ exists: hasColumn }] = await sql`
  select exists (
    select 1 from information_schema.columns
    where table_name = 'brands' and column_name = 'status_reason'
  ) as exists
`;

if (hasColumn) {
  console.log("brands.status_reason already exists.");
} else {
  await sql`alter table brands add column status_reason text`;
  console.log("Added brands.status_reason (nullable text).");
}

await sql.end();
