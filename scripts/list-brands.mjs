/**
 * List brands and their brand admins (email + status), and platform admins.
 * Read-only — useful for finding test accounts to log in with.
 *
 * Usage:
 *   node scripts/list-brands.mjs
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

const sql = postgres(env.DATABASE_URL, { ssl: "require" });

console.log("=== Brands ===");
const brands = await sql`
  select id, name, status, access_policy, admin_email, fulfillment_email
  from brands
  order by created_at
`;
for (const b of brands) {
  console.log(`\n${b.name}  [${b.status}, access: ${b.access_policy}]`);
  console.log(`  admin_email (registration contact): ${b.admin_email}`);
  console.log(`  fulfillment_email: ${b.fulfillment_email}`);

  const admins = await sql`
    select u.email, u.name, u.role, u.email_verified
    from brand_admins ba
    join users u on u.id = ba.user_id
    where ba.brand_id = ${b.id}
  `;
  if (admins.length === 0) {
    console.log("  -> no brand_admins users with login access yet");
  } else {
    for (const a of admins) {
      console.log(`  -> login: ${a.email}  (role: ${a.role}, verified: ${a.email_verified})`);
    }
  }
}

console.log("\n=== Platform admins ===");
const platformAdmins = await sql`
  select email, name, email_verified
  from users
  where role = 'platform_admin'
`;
for (const p of platformAdmins) {
  console.log(`  -> login: ${p.email}  (verified: ${p.email_verified})`);
}

await sql.end();
