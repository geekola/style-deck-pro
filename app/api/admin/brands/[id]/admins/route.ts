import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { brands, users, brandAdmins } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { audit, AuditAction } from "@/lib/audit";
import { createCredentialUser, generateTempPassword } from "@/lib/auth-provision";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requirePlatformAdmin();
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }
  const email = parsed.data.email.toLowerCase().trim();

  const [brand] = await db.select().from(brands).where(eq(brands.id, id)).limit(1);
  if (!brand) {
    return NextResponse.json({ error: "Brand not found" }, { status: 404 });
  }
  if (brand.status !== "approved") {
    return NextResponse.json(
      { error: "Brand must be approved before adding admins" },
      { status: 400 }
    );
  }

  const [existingUser] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  // Don't let a platform admin's account get repurposed as a brand admin —
  // it would silently lock them out of the admin console.
  if (existingUser && existingUser.role === "platform_admin") {
    return NextResponse.json(
      {
        error:
          "This email belongs to a platform admin account and can't be added as a brand admin.",
      },
      { status: 409 }
    );
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
    if (existingUser.role !== "brand_admin") {
      await db.update(users).set({ role: "brand_admin" }).where(eq(users.id, userId));
    }
  }

  const inserted = await db
    .insert(brandAdmins)
    .values({ userId, brandId: id })
    .onConflictDoNothing()
    .returning({ id: brandAdmins.id });

  await audit({
    actorId: session.user.id,
    action: AuditAction.BRAND_ADMIN_ADDED,
    entityType: "brand",
    entityId: id,
    metadata: { email },
    ip: request.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({
    email,
    alreadyExisted: !!existingUser,
    alreadyLinked: inserted.length === 0,
    tempPassword,
  });
}
