import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireBrandAdmin } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { brands, users, brandAdmins } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { audit, AuditAction } from "@/lib/audit";
import { createCredentialUser, generateTempPassword } from "@/lib/auth-provision";

const schema = z.object({
  email: z.string().email(),
});

/**
 * GET /api/brand/admins
 * Lists the other brand_admin users linked to the caller's own brand.
 */
export async function GET() {
  const { session, brandId } = await requireBrandAdmin();

  const admins = await db
    .select({
      userId: users.id,
      name: users.name,
      email: users.email,
      status: users.status,
    })
    .from(brandAdmins)
    .innerJoin(users, eq(users.id, brandAdmins.userId))
    .where(eq(brandAdmins.brandId, brandId));

  return NextResponse.json(
    admins.map((a) => ({ ...a, isYou: a.userId === session.user.id }))
  );
}

/**
 * POST /api/brand/admins
 * Self-service: a brand admin adds another admin user for their own brand.
 * Mirrors /api/admin/brands/[id]/admins (platform admin version), but scoped
 * to the caller's own brand and more conservative about existing accounts --
 * we won't silently repurpose an existing customer or other brand's admin
 * account, since that would change what that person can access.
 */
export async function POST(request: NextRequest) {
  const session_ = await requireBrandAdmin();
  const { session, brandId } = session_;

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }
  const email = parsed.data.email.toLowerCase().trim();

  const [brand] = await db.select().from(brands).where(eq(brands.id, brandId)).limit(1);
  if (!brand) {
    return NextResponse.json({ error: "Brand not found" }, { status: 404 });
  }

  const [existingUser] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser) {
    if (existingUser.role !== "brand_admin") {
      return NextResponse.json(
        {
          error:
            "This email is already associated with an existing StyleDeck account and can't be added as a brand admin here. Contact support if you need help.",
        },
        { status: 409 }
      );
    }

    const [existingLink] = await db
      .select({ id: brandAdmins.id })
      .from(brandAdmins)
      .where(eq(brandAdmins.userId, existingUser.id))
      .limit(1);

    if (existingLink) {
      return NextResponse.json(
        { error: "This email is already a brand admin (for this or another brand)." },
        { status: 409 }
      );
    }
  }

  let userId: string;
  let tempPassword: string | undefined;

  if (!existingUser) {
    tempPassword = generateTempPassword();
    const created = await createCredentialUser({
      email,
      name: `${brand.name} Admin`,
      role: "brand_admin",
      password: tempPassword,
      emailVerified: true,
    });
    userId = created.id;
  } else {
    userId = existingUser.id;
  }

  await db.insert(brandAdmins).values({ userId, brandId }).onConflictDoNothing();

  await audit({
    actorId: session.user.id,
    action: AuditAction.BRAND_ADMIN_ADDED,
    entityType: "brand",
    entityId: brandId,
    metadata: { email },
    ip: request.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ email, tempPassword });
}
