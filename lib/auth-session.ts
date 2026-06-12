import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { brandAdmins, brands, users } from "@/lib/db/schema";
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
    .select({
      brandId: brandAdmins.brandId,
      brandStatus: brands.status,
      userStatus: users.status,
    })
    .from(brandAdmins)
    .innerJoin(brands, eq(brands.id, brandAdmins.brandId))
    .innerJoin(users, eq(users.id, brandAdmins.userId))
    .where(eq(brandAdmins.userId, session.user.id))
    .limit(1);

  if (!brandAdmin) {
    throw new Response("Forbidden", { status: 403 });
  }

  // A platform admin can suspend this individual brand admin's access
  // without suspending the whole brand.
  if (brandAdmin.userStatus === "suspended") {
    throw new Response("Account suspended", { status: 403 });
  }

  // Suspended/rejected brands lose portal access even though the brand_admin
  // user account still exists.
  if (brandAdmin.brandStatus !== "approved") {
    throw new Response("Brand account is not active", { status: 403 });
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

// --- Page (Server Component) variants ----------------------------------------
//
// Thrown `Response` objects (above) are only meaningful in Route Handlers.
// In Server Components/pages, an uncaught throw of a non-Error value just
// surfaces as a generic "Response" error in the nearest error boundary.
// These variants redirect instead, which Next.js handles correctly during
// render.

/**
 * Page-safe: redirect to /login if there's no session.
 */
export async function requireSessionPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

/**
 * Page-safe: redirect to /login if not a platform admin.
 */
export async function requirePlatformAdminPage() {
  const session = await requireSessionPage();
  if (session.user.role !== "platform_admin") {
    redirect("/login");
  }
  return session;
}

/**
 * Page-safe: redirect to /login if not a brand admin (or has no brand assigned).
 */
export async function requireBrandAdminPage() {
  const session = await requireSessionPage();
  if (session.user.role !== "brand_admin") {
    redirect("/login");
  }

  const [brandAdmin] = await db
    .select({
      brandId: brandAdmins.brandId,
      brandStatus: brands.status,
      userStatus: users.status,
    })
    .from(brandAdmins)
    .innerJoin(brands, eq(brands.id, brandAdmins.brandId))
    .innerJoin(users, eq(users.id, brandAdmins.userId))
    .where(eq(brandAdmins.userId, session.user.id))
    .limit(1);

  if (!brandAdmin) {
    redirect("/login");
  }

  // A platform admin can suspend this individual brand admin's access
  // without suspending the whole brand.
  if (brandAdmin.userStatus === "suspended") {
    redirect("/login?error=admin_suspended");
  }

  // Suspended/rejected brands lose portal access even though the brand_admin
  // user account still exists.
  if (brandAdmin.brandStatus !== "approved") {
    redirect("/login?error=brand_suspended");
  }

  return { session, brandId: brandAdmin.brandId };
}

/**
 * Page-safe: redirect to /login if not a customer.
 */
export async function requireCustomerPage() {
  const session = await requireSessionPage();
  if (session.user.role !== "customer") {
    redirect("/login");
  }
  return session;
}
