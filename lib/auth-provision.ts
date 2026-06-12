import crypto from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { db } from "@/lib/db";
import { users, accounts } from "@/lib/db/schema";

/**
 * Create a new user with a credential (email/password) account, bypassing
 * better-auth's signup flow. Used when an admin provisions an account on
 * someone else's behalf (e.g. brand admin invites), since the admin plugin
 * (auth.api.createUser) isn't configured for this project.
 *
 * Mirrors the approach used in scripts/seed-admin.mjs.
 */
export async function createCredentialUser(params: {
  email: string;
  name: string;
  role: "platform_admin" | "brand_admin" | "customer";
  password: string;
  emailVerified?: boolean;
}): Promise<{ id: string }> {
  const userId = crypto.randomUUID();

  await db.insert(users).values({
    id: userId,
    email: params.email,
    name: params.name,
    role: params.role,
    emailVerified: params.emailVerified ?? false,
  });

  const passwordHash = await hashPassword(params.password);

  await db.insert(accounts).values({
    id: crypto.randomUUID(),
    accountId: userId,
    providerId: "credential",
    userId,
    password: passwordHash,
  });

  return { id: userId };
}

/**
 * Generate a 12-char URL-safe random temporary password for accounts
 * provisioned via createCredentialUser.
 */
export function generateTempPassword(): string {
  return crypto.randomBytes(9).toString("base64url");
}
