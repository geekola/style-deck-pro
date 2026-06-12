/**
 * Look up the most recent pending invite for an email and print the
 * registration link.
 *
 * Usage:
 *   node scripts/get-invite.mjs someone@example.com
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
  console.error("Usage: node scripts/get-invite.mjs <email>");
  process.exit(1);
}

const appUrl = env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const sql = postgres(env.DATABASE_URL, { ssl: "require" });

const rows = await sql`
  select token, status, source, expires_at, created_at
  from invites
  where email = ${email}
  order by created_at desc
  limit 5
`;

if (rows.length === 0) {
  console.log(`No invites found for ${email}`);
} else {
  for (const row of rows) {
    console.log(`status: ${row.status}  source: ${row.source}  created: ${row.created_at}  expires: ${row.expires_at}`);
    if (row.status === "pending") {
      console.log(`  -> ${appUrl}/invite/${row.token}`);
    }
  }
}

await sql.end();
