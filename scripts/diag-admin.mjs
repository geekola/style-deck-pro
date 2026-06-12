/**
 * Read-only diagnostic: shows all users/accounts/brand_admin rows
 * matching an email (case-insensitive).
 *
 * Usage:
 *   DIAG_EMAIL=geekola@gmail.com node scripts/diag-admin.mjs
 */

import postgres from "postgres";
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

const { DATABASE_URL, DIAG_EMAIL } = process.env;
if (!DATABASE_URL) throw new Error("DATABASE_URL is required");
const email = DIAG_EMAIL || "geekola@gmail.com";

const sql = postgres(DATABASE_URL, { max: 1 });

async function main() {
  console.log(`\n=== users matching "${email}" (case-insensitive) ===`);
  const users = await sql`
    SELECT id, email, role, email_verified, created_at
    FROM users
    WHERE email ILIKE ${email}
  `;
  console.table(users);

  for (const u of users) {
    console.log(`\n--- accounts for user ${u.id} (${u.email}) ---`);
    const accounts = await sql`
      SELECT id, provider_id, account_id, (password IS NOT NULL) AS has_password, updated_at
      FROM accounts WHERE user_id = ${u.id}
    `;
    console.table(accounts);

    console.log(`--- sessions for user ${u.id} ---`);
    const sessions = await sql`
      SELECT id, expires_at, created_at FROM sessions WHERE user_id = ${u.id}
    `;
    console.table(sessions);

    console.log(`--- brand_admins for user ${u.id} ---`);
    const brandAdmins = await sql`
      SELECT id, brand_id, created_at FROM brand_admins WHERE user_id = ${u.id}
    `;
    console.table(brandAdmins);
  }

  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
