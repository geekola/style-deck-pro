/**
 * Migration: add first_name + last_name columns to users and customer_contacts.
 * Populates them by splitting the existing name field on the first space.
 *
 * Safe to run multiple times (checks information_schema before altering).
 *
 * Usage:
 *   node scripts/run-name-migration.mjs
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

// --- users table ---

const [{ exists: hasFirstName }] = await sql`
  select exists (
    select 1 from information_schema.columns
    where table_name = 'users' and column_name = 'first_name'
  ) as exists
`;

if (hasFirstName) {
  console.log("users.first_name already exists — skipping users columns.");
} else {
  await sql`alter table "users" add column "first_name" text`;
  await sql`alter table "users" add column "last_name" text`;
  console.log("Added users.first_name and users.last_name.");

  // Populate from existing name: split on first space
  await sql`
    update "users"
    set
      "first_name" = split_part("name", ' ', 1),
      "last_name"  = trim(substring("name" from position(' ' in "name") + 1))
    where "name" is not null and "name" != ''
  `;
  // For single-word names (no space), put it all in first_name and leave last_name empty string
  await sql`
    update "users"
    set "last_name" = ''
    where "last_name" is null
  `;
  console.log("Populated users.first_name and users.last_name from existing name data.");
}

// --- customer_contacts table ---

const [{ exists: hasContactFirstName }] = await sql`
  select exists (
    select 1 from information_schema.columns
    where table_name = 'customer_contacts' and column_name = 'first_name'
  ) as exists
`;

if (hasContactFirstName) {
  console.log("customer_contacts.first_name already exists — skipping contacts columns.");
} else {
  await sql`alter table "customer_contacts" add column "first_name" text not null default ''`;
  await sql`alter table "customer_contacts" add column "last_name" text not null default ''`;
  console.log("Added customer_contacts.first_name and customer_contacts.last_name.");

  // Populate from existing name
  await sql`
    update "customer_contacts"
    set
      "first_name" = split_part("name", ' ', 1),
      "last_name"  = trim(substring("name" from position(' ' in "name") + 1))
    where "name" is not null and "name" != ''
  `;
  await sql`
    update "customer_contacts"
    set "last_name" = ''
    where "last_name" is null
  `;
  console.log("Populated customer_contacts.first_name and customer_contacts.last_name from existing name data.");

  // Make name column nullable (it is now derived, not primary)
  await sql`alter table "customer_contacts" alter column "name" drop not null`;
  console.log("Made customer_contacts.name nullable.");
}

await sql.end();
console.log("\nDone. Run this against production when ready.");
