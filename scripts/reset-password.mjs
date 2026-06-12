/**
 * Reset (or create) the email/password credential for an existing user,
 * without changing their role. Useful for logging into seeded test
 * accounts (brand admins, customers, etc.) whose passwords are unknown.
 *
 * Usage:
 *   RESET_EMAIL=testbrandfive@example.com RESET_PASSWORD=ChangeMe123! \
 *     node scripts/reset-password.mjs
 *
 * (DATABASE_URL is read from .env.local automatically)
 */

import postgres from "postgres";
import { hashPassword } from "better-auth/crypto";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

const { DATABASE_URL, RESET_EMAIL, RESET_PASSWORD } = process.env;
if (!DATABASE_URL) throw new Error("DATABASE_URL is required");
if (!RESET_EMAIL) throw new Error("RESET_EMAIL is required");
if (!RESET_PASSWORD) throw new Error("RESET_PASSWORD is required");
if (RESET_PASSWORD.length < 8) {
  throw new Error("RESET_PASSWORD must be at least 8 characters");
}

const sql = postgres(DATABASE_URL, { max: 1 });

async function main() {
  const [user] = await sql`
    SELECT id, role, email_verified FROM users WHERE email = ${RESET_EMAIL} LIMIT 1
  `;

  if (!user) {
    console.error(`No user found with email ${RESET_EMAIL}`);
    await sql.end();
    process.exit(1);
  }

  const passwordHash = await hashPassword(RESET_PASSWORD);

  const [existingAccount] = await sql`
    SELECT id FROM accounts WHERE user_id = ${user.id} AND provider_id = 'credential' LIMIT 1
  `;

  if (existingAccount) {
    await sql`
      UPDATE accounts SET password = ${passwordHash}, updated_at = now()
      WHERE id = ${existingAccount.id}
    `;
    console.log(`Password reset for ${RESET_EMAIL}`);
  } else {
    await sql`
      INSERT INTO accounts (id, account_id, provider_id, user_id, password)
      VALUES (${crypto.randomUUID()}, ${user.id}, 'credential', ${user.id}, ${passwordHash})
    `;
    console.log(`Credential account created for ${RESET_EMAIL}`);
  }

  if (!user.email_verified) {
    await sql`UPDATE users SET email_verified = true WHERE id = ${user.id}`;
    console.log(`(also marked email_verified = true)`);
  }

  console.log(`\nYou can now log in at /login with:`);
  console.log(`  Email:    ${RESET_EMAIL}`);
  console.log(`  Password: ${RESET_PASSWORD}`);
  console.log(`  Role:     ${user.role}`);

  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
