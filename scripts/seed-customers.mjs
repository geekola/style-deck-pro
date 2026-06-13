/**
 * Seeds a handful of test customer accounts (user + customer profile +
 * measurements + working credential login) for QA/testing — e.g. exercising
 * the multi-item checkout flow with several distinct customers.
 *
 * Usage:
 *   node scripts/seed-customers.mjs
 *
 * Optional:
 *   SEED_CUSTOMER_COUNT=5 node scripts/seed-customers.mjs   (default 5)
 *   SEED_CUSTOMER_PASSWORD=ChangeMe123! node scripts/seed-customers.mjs
 *
 * (DATABASE_URL is read from .env.local automatically)
 *
 * Safe to run multiple times — existing test accounts (matched by email)
 * are updated in place rather than duplicated.
 */

import postgres from "postgres";
import { hashPassword } from "better-auth/crypto";
import crypto from "node:crypto";
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
    if (!(key in process.env)) process.env[key] = value;
  }
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is required");

const COUNT = parseInt(process.env.SEED_CUSTOMER_COUNT ?? "5", 10);
const PASSWORD = process.env.SEED_CUSTOMER_PASSWORD ?? "TestPass123!";

// Cycle through these so seeded customers exercise different filters/types.
const CUSTOMER_TYPES = ["actor", "athlete", "influencer", "performer"];
const INDUSTRIES = ["film", "music", "sports", "fashion", "business", "media", "technology", "other"];

const sql = postgres(DATABASE_URL, { max: 1 });

async function main() {
  const passwordHash = await hashPassword(PASSWORD);
  const created = [];

  for (let i = 1; i <= COUNT; i++) {
    const email = `test.customer${i}@styledeck.test`;
    const name = `Test Customer ${i}`;
    const customerType = CUSTOMER_TYPES[(i - 1) % CUSTOMER_TYPES.length];
    const industry = INDUSTRIES[(i - 1) % INDUSTRIES.length];
    const gender = i % 2 === 0 ? "female" : "male";

    // 1. User
    let userId;
    const existingUser = await sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
    if (existingUser.length > 0) {
      userId = existingUser[0].id;
      await sql`
        UPDATE users SET name = ${name}, email_verified = true, role = 'customer', status = 'active'
        WHERE id = ${userId}
      `;
    } else {
      userId = crypto.randomUUID();
      await sql`
        INSERT INTO users (id, email, name, email_verified, role, status)
        VALUES (${userId}, ${email}, ${name}, true, 'customer', 'active')
      `;
    }

    // 2. Credential account (password login)
    const existingAccount = await sql`
      SELECT id FROM accounts WHERE user_id = ${userId} AND provider_id = 'credential' LIMIT 1
    `;
    if (existingAccount.length > 0) {
      await sql`UPDATE accounts SET password = ${passwordHash}, updated_at = now() WHERE id = ${existingAccount[0].id}`;
    } else {
      await sql`
        INSERT INTO accounts (id, account_id, provider_id, user_id, password)
        VALUES (${crypto.randomUUID()}, ${userId}, 'credential', ${userId}, ${passwordHash})
      `;
    }

    // 3. Customer profile
    let customerId;
    const existingCustomer = await sql`SELECT id FROM customers WHERE user_id = ${userId} LIMIT 1`;
    if (existingCustomer.length > 0) {
      customerId = existingCustomer[0].id;
      await sql`
        UPDATE customers SET type = ${customerType}, industry = ${industry}, status = 'active'
        WHERE id = ${customerId}
      `;
    } else {
      customerId = crypto.randomUUID();
      await sql`
        INSERT INTO customers (id, user_id, type, industry, status)
        VALUES (${customerId}, ${userId}, ${customerType}, ${industry}, 'active')
      `;
    }

    // 4. Measurements (so checkout's "complete your measurements" gate passes)
    const existingMeasurements = await sql`SELECT id FROM measurements WHERE customer_id = ${customerId} LIMIT 1`;
    if (existingMeasurements.length === 0) {
      await sql`
        INSERT INTO measurements (
          id, customer_id, gender, unit_system,
          height, weight, shoe_size, shoe_width,
          chest, waist, hips, neck, shoulder_width, sleeve_length, inseam
        ) VALUES (
          ${crypto.randomUUID()}, ${customerId}, ${gender}, 'imperial',
          ${gender === "male" ? "5'10\"" : "5'6\""}, ${gender === "male" ? "175" : "135"}, '9', 'medium',
          ${gender === "male" ? "40" : "34"}, ${gender === "male" ? "34" : "28"}, ${gender === "male" ? "40" : "38"},
          '15', '18', '25', '32'
        )
      `;
    }

    created.push({ email, name, customerType, industry, gender });
  }

  console.log(`Seeded ${created.length} test customer(s):\n`);
  for (const c of created) {
    console.log(`  ${c.email}  (${c.customerType} / ${c.industry} / ${c.gender})`);
  }
  console.log(`\nPassword for all: ${PASSWORD}`);
  console.log(`Log in at /login.`);

  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
