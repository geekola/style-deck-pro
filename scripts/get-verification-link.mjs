/**
 * Look up the most recent email-verification token for a user and print
 * the verification link. Workaround for local dev where Resend's sandbox
 * sender (onboarding@resend.dev, no verified domain) can only deliver to
 * the Resend account owner's own email address -- so verification emails
 * to other test addresses silently fail to arrive.
 *
 * Usage:
 *   node scripts/get-verification-link.mjs someone@example.com
 *
 * (DATABASE_URL / BETTER_AUTH_URL are read from .env.local automatically)
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
  console.error("Usage: node scripts/get-verification-link.mjs <email>");
  process.exit(1);
}

const baseUrl = env.BETTER_AUTH_URL || env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const sql = postgres(env.DATABASE_URL, { ssl: "require" });

// better-auth stores email verification tokens with identifier
// "verify-email-<token>" -> value is a JSON blob, OR identifier = email
// depending on version. Try a few likely matches.
const rows = await sql`
  select id, identifier, value, expires_at, created_at
  from verifications
  where identifier ilike ${"%" + email + "%"}
     or identifier = ${email}
  order by created_at desc
  limit 5
`;

if (rows.length === 0) {
  console.log(`No verification tokens found for ${email}`);
  console.log(`(They may have already verified, or signup hasn't completed yet.)`);
} else {
  for (const row of rows) {
    const expired = new Date(row.expires_at) < new Date();
    console.log(`identifier: ${row.identifier}  created: ${row.created_at}  expired: ${expired}`);
    // value is the raw token used in the verify-email link
    console.log(`  -> ${baseUrl}/api/auth/verify-email?token=${row.value}&callbackURL=/`);
  }
}

await sql.end();
