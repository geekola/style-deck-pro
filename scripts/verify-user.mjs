/**
 * Marks a user's email as verified directly in the DB, bypassing the
 * email-verification flow entirely (for local test accounts where Resend
 * can't deliver to the test address).
 *
 * Usage:
 *   node scripts/verify-user.mjs someone@example.com
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
  console.error("Usage: node scripts/verify-user.mjs <email>");
  process.exit(1);
}

const sql = postgres(env.DATABASE_URL, { ssl: "require" });

const [user] = await sql`
  update users set email_verified = true
  where email = ${email}
  returning id, email, email_verified
`;

if (!user) {
  console.log(`No user found with email ${email}`);
} else {
  console.log(`email_verified set to true for ${user.email} (id: ${user.id})`);
}

await sql.end();
