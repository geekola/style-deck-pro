/**
 * One-time cleanup script (plain JS, no build step) to fully remove a test
 * brand and any brand_admin accounts that exist solely for that brand.
 *
 * Usage:
 *   BRAND_NAME="My Brand" node scripts/delete-brand.mjs
 *
 * (DATABASE_URL is read from .env.local automatically)
 *
 * What it does:
 *  - Finds the brand by exact name.
 *  - Refuses to proceed if the brand has any orders (to avoid an FK error
 *    and to avoid silently destroying order history).
 *  - Deletes the brand row. Products, product images, brand_admins links,
 *    brand_access, gifting_allowances, and invites cascade automatically.
 *  - For any user who was a brand_admin ONLY for this brand (no other
 *    brand_admins rows after the cascade), removes their credential
 *    account, sessions, and user row too — since they were created
 *    specifically to administer this brand.
 *  - Leaves platform_admin accounts (e.g. yours) untouched aside from
 *    removing the stale brand_admins link via cascade.
 */

import postgres from "postgres";
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

const { DATABASE_URL, BRAND_NAME } = process.env;
if (!DATABASE_URL) throw new Error("DATABASE_URL is required");
const brandName = BRAND_NAME || "My Brand";

const sql = postgres(DATABASE_URL, { max: 1 });

async function main() {
  const [brand] = await sql`
    SELECT id, name, admin_email, status
    FROM brands
    WHERE name = ${brandName}
    LIMIT 1
  `;

  if (!brand) {
    console.log(`No brand found with name "${brandName}". Nothing to do.`);
    await sql.end();
    return;
  }

  console.log(
    `Found brand "${brand.name}" (${brand.id}), status=${brand.status}, admin_email=${brand.admin_email}`
  );

  const [{ count: orderCount }] = await sql`
    SELECT count(*)::int AS count FROM orders WHERE brand_id = ${brand.id}
  `;
  if (orderCount > 0) {
    console.error(
      `Refusing to delete: this brand has ${orderCount} order(s). ` +
        `Remove or reassign those first if you really want to delete the brand.`
    );
    await sql.end();
    process.exit(1);
  }

  const [{ count: productCount }] = await sql`
    SELECT count(*)::int AS count FROM products WHERE brand_id = ${brand.id}
  `;
  console.log(`This will also delete ${productCount} product(s) (cascade).`);

  // Capture brand_admin links before the cascade removes them.
  const linkedAdmins = await sql`
    SELECT u.id, u.email, u.role
    FROM brand_admins ba
    JOIN users u ON u.id = ba.user_id
    WHERE ba.brand_id = ${brand.id}
  `;

  await sql`DELETE FROM brands WHERE id = ${brand.id}`;
  console.log(`Deleted brand "${brand.name}" and its products/access/gifting/invites.`);

  for (const admin of linkedAdmins) {
    if (admin.role !== "brand_admin") {
      console.log(`Left ${admin.email} (role=${admin.role}) untouched.`);
      continue;
    }

    const remaining = await sql`
      SELECT 1 FROM brand_admins WHERE user_id = ${admin.id} LIMIT 1
    `;
    if (remaining.length > 0) {
      console.log(`${admin.email} still admins other brands — left untouched.`);
      continue;
    }

    await sql`DELETE FROM audit_logs WHERE actor_id = ${admin.id}`;
    await sql`DELETE FROM sessions WHERE user_id = ${admin.id}`;
    await sql`DELETE FROM accounts WHERE user_id = ${admin.id}`;
    await sql`DELETE FROM users WHERE id = ${admin.id}`;
    console.log(`Removed orphaned brand_admin account: ${admin.email}`);
  }

  console.log("\nDone.");
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
