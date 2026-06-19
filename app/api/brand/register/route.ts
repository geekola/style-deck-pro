import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { brands } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { audit, AuditAction } from "@/lib/audit";
import { sendBrandApplicationEmail } from "@/lib/email";

const schema = z.object({
  name: z.string().min(2).max(100),
  category: z.enum(["casual", "business", "formal", "custom"]),
  adminEmail: z.string().email(),
  fulfillmentEmail: z.string().email(),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, category, adminEmail, fulfillmentEmail } = parsed.data;

  // Prevent duplicate brand registrations for the same admin email
  const existing = await db
    .select({ id: brands.id })
    .from(brands)
    .where(eq(brands.adminEmail, adminEmail))
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json(
      { error: "A brand is already registered with this email" },
      { status: 409 }
    );
  }

  const [brand] = await db
    .insert(brands)
    .values({ name, category, adminEmail, fulfillmentEmail })
    .returning();

  await audit({
    actorId: null,
    action: AuditAction.BRAND_REGISTERED,
    entityType: "brand",
    entityId: brand.id,
    metadata: { name, adminEmail },
    ip: request.headers.get("x-forwarded-for") ?? undefined,
  });

  // Send confirmation email (non-blocking)
  sendBrandApplicationEmail({ to: adminEmail, brandName: name }).catch(console.error);

  return NextResponse.json({ id: brand.id, status: brand.status }, { status: 201 });
}
