/**
 * Brings the DB in line with schema.ts changes for platform admin polish:
 *   - new user_status enum (active/suspended)
 *   - users gains a status column (default 'active'), used to suspend a
 *     brand_admin's portal access without suspending the whole brand
 *
 * Safe to run multiple times (checks before altering).
 *
 * Usage:
 *   node scripts/add-user-status-field.mjs
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

// 1. Create user_status enum, if not already present
const [{ exists: hasEnum }] = await sql`
  select exists (
    select 1 from pg_type where typname = 'user_status'
  ) as exists
`;

if (hasEnum) {
  console.log("user_status enum already exists.");
} else {
  await sql`create type user_status as enum ('active', 'suspended')`;
  console.log("Created user_status enum (active, suspended).");
}

// 2. Add status column to users, if not already present
const [{ exists: hasColumn }] = await sql`
  select exists (
    select 1 from information_schema.columns
    where table_name = 'users' and column_name = 'status'
  ) as exists
`;

if (hasColumn) {
  console.log("users.status already exists.");
} else {
  await sql`alter table users add column status user_status not null default 'active'`;
  console.log("Added users.status (user_status, default 'active').");
}

await sql.end();
