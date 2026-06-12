/**
 * One-time seed script (plain JS, no build step) to create the first
 * platform admin with a working email/password credential.
 *
 * Usage:
 *   SEED_ADMIN_EMAIL=admin@example.com \
 *   SEED_ADMIN_PASSWORD=ChangeMe123! \
 *   SEED_ADMIN_NAME="Admin" \
 *   node scripts/seed-admin.mjs
 *
 * (DATABASE_URL is read from .env.local automatically)
 *
 * Safe to run multiple times — will update the role, mark the email
 * verified, and reset/create the password each time it's run.
 */

import postgres from "postgres";
import { hashPassword } from "better-auth/crypto";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Minimal .env.local loader (avoids requiring the `dotenv` package)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env.local");
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
    if (!(key in process.env)) process.env[key] = value;
  }
}

const { DATABASE_URL, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_ADMIN_NAME } =
  process.env;

if (!DATABASE_URL) throw new Error("DATABASE_URL is required");
if (!SEED_ADMIN_EMAIL) throw new Error("SEED_ADMIN_EMAIL is required");
if (!SEED_ADMIN_PASSWORD) throw new Error("SEED_ADMIN_PASSWORD is required");
if (SEED_ADMIN_PASSWORD.length < 8) {
  throw new Error("SEED_ADMIN_PASSWORD must be at least 8 characters");
}

const sql = postgres(DATABASE_URL, { max: 1 });

async function main() {
  let userId;

  const existing = await sql`
    SELECT id FROM users WHERE email = ${SEED_ADMIN_EMAIL} LIMIT 1
  `;

  if (existing.length > 0) {
    userId = existing[0].id;
    await sql`
      UPDATE users SET role = 'platform_admin', email_verified = true
      WHERE id = ${userId}
    `;
    console.log(`Existing user ${SEED_ADMIN_EMAIL} elevated to platform_admin`);
  } else {
    userId = crypto.randomUUID();
    await sql`
      INSERT INTO users (id, email, name, email_verified, role)
      VALUES (${userId}, ${SEED_ADMIN_EMAIL}, ${SEED_ADMIN_NAME ?? "Platform Admin"}, true, 'platform_admin')
    `;
    console.log(`Created platform_admin: ${SEED_ADMIN_EMAIL}`);
  }

  const passwordHash = await hashPassword(SEED_ADMIN_PASSWORD);

  const existingAccount = await sql`
    SELECT id FROM accounts WHERE user_id = ${userId} AND provider_id = 'credential' LIMIT 1
  `;

  if (existingAccount.length > 0) {
    await sql`
      UPDATE accounts SET password = ${passwordHash}, updated_at = now()
      WHERE id = ${existingAccount[0].id}
    `;
    console.log(`Password reset for ${SEED_ADMIN_EMAIL}`);
  } else {
    await sql`
      INSERT INTO accounts (id, account_id, provider_id, user_id, password)
      VALUES (${crypto.randomUUID()}, ${userId}, 'credential', ${userId}, ${passwordHash})
    `;
    console.log(`Credential account created for ${SEED_ADMIN_EMAIL}`);
  }

  console.log(`\nYou can now log in at /login with:`);
  console.log(`  Email:    ${SEED_ADMIN_EMAIL}`);
  console.log(`  Password: ${SEED_ADMIN_PASSWORD}`);

  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
