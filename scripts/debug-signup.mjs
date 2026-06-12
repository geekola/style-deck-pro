/**
 * Diagnose a stuck signup: checks whether the user row exists, whether
 * they're verified, and lists the most recent verification tokens in the
 * table (regardless of identifier format) so we can see what better-auth
 * actually wrote.
 *
 * Usage:
 *   node scripts/debug-signup.mjs someone@example.com
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

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/debug-signup.mjs <email>");
  process.exit(1);
}

const sql = postgres(env.DATABASE_URL, { ssl: "require" });

console.log(`=== users matching ${email} ===`);
const users = await sql`
  select id, email, name, role, email_verified, created_at
  from users
  where email = ${email}
`;
if (users.length === 0) {
  console.log("  -> no user row found (signup did not create a user)");
} else {
  for (const u of users) {
    console.log(`  id: ${u.id}`);
    console.log(`  role: ${u.role}  email_verified: ${u.email_verified}  created: ${u.created_at}`);
  }
}

console.log(`\n=== accounts (credential) for this user ===`);
if (users[0]) {
  const accounts = await sql`
    select provider_id, account_id, created_at
    from accounts
    where user_id = ${users[0].id}
  `;
  if (accounts.length === 0) {
    console.log("  -> no accounts rows (no password set)");
  } else {
    for (const a of accounts) {
      console.log(`  provider: ${a.provider_id}  created: ${a.created_at}`);
    }
  }
}

console.log(`\n=== 10 most recent verification tokens (any identifier) ===`);
const verifications = await sql`
  select id, identifier, value, expires_at, created_at
  from verifications
  order by created_at desc
  limit 10
`;
if (verifications.length === 0) {
  console.log("  -> verifications table is empty");
} else {
  for (const v of verifications) {
    console.log(`  identifier: ${v.identifier}`);
    console.log(`    value: ${v.value.slice(0, 60)}...  created: ${v.created_at}  expires: ${v.expires_at}`);
  }
}

console.log(`\n=== invites for ${email} ===`);
const invites = await sql`
  select token, status, source, created_at, expires_at
  from invites
  where email = ${email}
  order by created_at desc
  limit 5
`;
for (const i of invites) {
  console.log(`  status: ${i.status}  source: ${i.source}  created: ${i.created_at}`);
}

await sql.end();
