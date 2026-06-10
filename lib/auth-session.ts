import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { brandAdmins } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Get the current session in a Server Component or API Route.
 * Returns null if not authenticated.
 */
export async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

/**
 * Assert the request has an authenticated session.
 * Throws a Response (401) if not authenticated.
 */
export async function requireSession() {
  const session = await getSession();
  if (!session) {
    throw new Response("Unauthorized", { status: 401 });
  }
  return session;
}

/**
 * Assert the request is authenticated as a platform admin.
 */
export async function requirePlatformAdmin() {
  const session = await requireSession();
  if (session.user.role !== "platform_admin") {
    throw new Response("Forbidden", { status: 403 });
  }
  return session;
}

/**
 * Assert the request is authenticated as a brand admin and return their brandId.
 * Throws 403 if the user is not a brand admin.
 */
export async function requireBrandAdmin() {
  const session = await requireSession();
  if (session.user.role !== "brand_admin") {
    throw new Response("Forbidden", { status: 403 });
  }

  const [brandAdmin] = await db
    .select({ brandId: brandAdmins.brandId })
    .from(brandAdmins)
    .where(eq(brandAdmins.userId, session.user.id))
    .limit(1);

  if (!brandAdmin) {
    throw new Response("Forbidden", { status: 403 });
  }

  return { session, brandId: brandAdmin.brandId };
}

/**
 * Assert the request is authenticated as a customer and return their customerId.
 */
export async function requireCustomer() {
  const session = await requireSession();
  if (session.user.role !== "customer") {
    throw new Response("Forbidden", { status: 403 });
  }
  return session;
}
