import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { users, customers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { audit, AuditAction } from "@/lib/audit";

const schema = z.object({
  customerStatus: z.enum(["active", "suspended"]),
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

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Update customer status (affects discovery feed access)
  await db
    .update(customers)
    .set({ status: parsed.data.customerStatus })
    .where(eq(customers.userId, id));

  await audit({
    actorId: session.user.id,
    action:
      parsed.data.customerStatus === "suspended"
        ? AuditAction.USER_SUSPENDED
        : AuditAction.USER_ACTIVATED,
    entityType: "user",
    entityId: id,
    ip: request.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ id, customerStatus: parsed.data.customerStatus });
}
