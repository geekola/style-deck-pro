import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { brands, users, brandAdmins } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { audit, AuditAction } from "@/lib/audit";
import { sendBrandApprovalEmail } from "@/lib/email";
import { auth } from "@/lib/auth";

const schema = z.object({
  status: z.enum(["approved", "rejected"]),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requirePlatformAdmin();
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const [brand] = await db
    .select()
    .from(brands)
    .where(eq(brands.id, id))
    .limit(1);

  if (!brand) {
    return NextResponse.json({ error: "Brand not found" }, { status: 404 });
  }

  const { status } = parsed.data;

  await db.update(brands).set({ status, updatedAt: new Date() }).where(eq(brands.id, id));

  // If approving, create a brand_admin user account for the admin email
  if (status === "approved") {
    // Check if a user already exists with this email
    let [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, brand.adminEmail))
      .limit(1);

    if (!existingUser) {
      // Create the user account — they'll set their password via email verification
      const newUser = await auth.api.createUser({
        body: {
          email: brand.adminEmail,
          name: brand.name,
          role: "brand_admin",
          password: crypto.randomUUID(), // temporary; they'll reset via email
          emailVerified: false,
        },
      });
      existingUser = { id: newUser.user.id };
    } else {
      // Elevate existing user to brand_admin
      await db
        .update(users)
        .set({ role: "brand_admin" })
        .where(eq(users.id, existingUser.id));
    }

    // Create brand_admin link
    await db
      .insert(brandAdmins)
      .values({ userId: existingUser.id, brandId: id })
      .onConflictDoNothing();
  }

  await audit({
    actorId: session.user.id,
    action: status === "approved" ? AuditAction.BRAND_APPROVED : AuditAction.BRAND_REJECTED,
    entityType: "brand",
    entityId: id,
    ip: request.headers.get("x-forwarded-for") ?? undefined,
  });

  // Send email notification (non-blocking)
  sendBrandApprovalEmail({
    to: brand.adminEmail,
    brandName: brand.name,
    approved: status === "approved",
  }).catch(console.error);

  return NextResponse.json({ id, status });
}
