/**
 * Fixes schema drift on customers.status: schema.ts declares
 *   status: customerStatusEnum("status").notNull().default("active")
 * but the actual DB column allows NULL with no default, so inserts that
 * don't specify status (e.g. completeInvite) end up NULL.
 *
 * This script:
 *   1. Backfills any existing NULL rows to 'active'
 *   2. Sets the column DEFAULT to 'active' and adds NOT NULL
 *
 * Usage:
 *   node scripts/fix-customer-status.mjs
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

const before = await sql`select id, status from customers where status is null`;
console.log(`Found ${before.length} customer row(s) with NULL status.`);

if (before.length > 0) {
  await sql`update customers set status = 'active' where status is null`;
  console.log(`Backfilled ${before.length} row(s) to 'active'.`);
}

await sql`alter table customers alter column status set default 'active'`;
await sql`alter table customers alter column status set not null`;
console.log(`Column customers.status now NOT NULL DEFAULT 'active' (matches schema.ts).`);

await sql.end();
