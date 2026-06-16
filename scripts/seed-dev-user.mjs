/**
 * Seed the dev role-switcher account.
 *
 * Usage:
 *   node scripts/seed-dev-user.mjs
 *
 * Creates (or resets) a single user that can visit /dev and switch between
 * platform_admin, brand_admin, and customer roles without logging out.
 *
 * Credentials:
 *   Email:    dev@styledeck.test
 *   Password: DevPassword1!
 *
 * Safe to run multiple times.
 */

import postgres from "postgres";
import { hashPassword } from "better-auth/crypto";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Minimal .env.local loader
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

const { DATABASE_URL } = process.env;
if (!DATABASE_URL) throw new Error("DATABASE_URL is required");

const DEV_EMAIL = "dev@styledeck.test";
const DEV_PASSWORD = "DevPassword1!";
const DEV_NAME = "Dev User";

const sql = postgres(DATABASE_URL, { max: 1 });

async function main() {
  console.log("Seeding dev user...\n");

  // 1. Upsert user (start as platform_admin so /dev is immediately accessible)
  let userId;
  const [existing] = await sql`SELECT id FROM users WHERE email = ${DEV_EMAIL} LIMIT 1`;

  if (existing) {
    userId = existing.id;
    await sql`
      UPDATE users
      SET role = 'platform_admin', email_verified = true, name = ${DEV_NAME}
      WHERE id = ${userId}
    `;
    console.log(`✓ Updated existing user: ${DEV_EMAIL}`);
  } else {
    userId = crypto.randomUUID();
    await sql`
      INSERT INTO users (id, email, name, email_verified, role)
      VALUES (${userId}, ${DEV_EMAIL}, ${DEV_NAME}, true, 'platform_admin')
    `;
    console.log(`✓ Created user: ${DEV_EMAIL}`);
  }

  // 2. Upsert password credential
  const passwordHash = await hashPassword(DEV_PASSWORD);
  const [existingAccount] = await sql`
    SELECT id FROM accounts
    WHERE user_id = ${userId} AND provider_id = 'credential'
    LIMIT 1
  `;

  if (existingAccount) {
    await sql`
      UPDATE accounts SET password = ${passwordHash}, updated_at = now()
      WHERE id = ${existingAccount.id}
    `;
  } else {
    await sql`
      INSERT INTO accounts (id, account_id, provider_id, user_id, password)
      VALUES (${crypto.randomUUID()}, ${userId}, 'credential', ${userId}, ${passwordHash})
    `;
  }
  console.log("✓ Password set");

  // 3. Ensure dev test brand exists (for brand_admin switching)
  const DEV_BRAND_NAME = "__Dev Test Brand__";
  const [existingBrand] = await sql`
    SELECT id FROM brands WHERE name = ${DEV_BRAND_NAME} LIMIT 1
  `;

  let brandId;
  if (existingBrand) {
    brandId = existingBrand.id;
    await sql`UPDATE brands SET status = 'approved' WHERE id = ${brandId}`;
    console.log("✓ Dev test brand already exists");
  } else {
    const [newBrand] = await sql`
      INSERT INTO brands (name, category, admin_email, fulfillment_email, status, access_policy)
      VALUES (${DEV_BRAND_NAME}, 'casual', ${DEV_EMAIL}, ${DEV_EMAIL}, 'approved', 'open')
      RETURNING id
    `;
    brandId = newBrand.id;
    console.log("✓ Created dev test brand");
  }

  // 4. Ensure brandAdmins record
  const [existingBA] = await sql`
    SELECT id FROM brand_admins WHERE user_id = ${userId} AND brand_id = ${brandId} LIMIT 1
  `;
  if (!existingBA) {
    await sql`
      INSERT INTO brand_admins (id, user_id, brand_id)
      VALUES (${crypto.randomUUID()}, ${userId}, ${brandId})
    `;
    console.log("✓ Linked user to dev test brand");
  } else {
    console.log("✓ Brand admin link already exists");
  }

  // 5. Ensure customer record
  const [existingCustomer] = await sql`
    SELECT id FROM customers WHERE user_id = ${userId} LIMIT 1
  `;
  if (!existingCustomer) {
    await sql`
      INSERT INTO customers (id, user_id, type, industry, status)
      VALUES (${crypto.randomUUID()}, ${userId}, 'actor', 'film', 'active')
    `;
    console.log("✓ Created customer record");
  } else {
    console.log("✓ Customer record already exists");
  }

  console.log(`
Done! Log in at /login then visit /dev to switch roles.

  Email:    ${DEV_EMAIL}
  Password: ${DEV_PASSWORD}
`);

  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
