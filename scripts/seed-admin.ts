/**
 * One-time seed script to create the first platform admin.
 *
 * Usage:
 *   DATABASE_URL=... SEED_ADMIN_EMAIL=admin@example.com SEED_ADMIN_NAME="Admin" npm run db:seed-admin
 *
 * Safe to run multiple times — will skip if the admin already exists.
 */

import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "../lib/db/schema";

const { DATABASE_URL, SEED_ADMIN_EMAIL, SEED_ADMIN_NAME } = process.env;

if (!DATABASE_URL) throw new Error("DATABASE_URL is required");
if (!SEED_ADMIN_EMAIL) throw new Error("SEED_ADMIN_EMAIL is required");

const client = postgres(DATABASE_URL, { max: 1 });
const db = drizzle(client, { schema });

async function main() {
  const existing = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, SEED_ADMIN_EMAIL!))
    .limit(1);

  if (existing.length > 0) {
    // Ensure role is platform_admin in case the account already existed
    await db
      .update(schema.users)
      .set({ role: "platform_admin" })
      .where(eq(schema.users.email, SEED_ADMIN_EMAIL!));
    console.log(`✓ Existing user ${SEED_ADMIN_EMAIL} elevated to platform_admin`);
  } else {
    await db.insert(schema.users).values({
      id: crypto.randomUUID(),
      email: SEED_ADMIN_EMAIL!,
      name: SEED_ADMIN_NAME ?? "Platform Admin",
      emailVerified: true,
      role: "platform_admin",
    });
    console.log(`✓ Created platform_admin: ${SEED_ADMIN_EMAIL}`);
    console.log(
      `  Set a password via the app's forgot-password flow or insert a hashed password into accounts.`
    );
  }

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
