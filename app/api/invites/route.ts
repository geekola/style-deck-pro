import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireBrandAdmin } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { invites } from "@/lib/db/schema";
import { audit, AuditAction } from "@/lib/audit";
import { sendInviteEmail } from "@/lib/email";

const schema = z.object({
  email: z.string().email(),
});

/**
 * POST /api/invites
 * Brand admins use this to invite customers.
 * Platform admin invites go through /api/admin/invites.
 */
export async function POST(request: NextRequest) {
  const { session, brandId } = await requireBrandAdmin();

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await db.insert(invites).values({
    email: parsed.data.email,
    source: "brand",
    brandId,
    token,
    expiresAt,
  });

  await audit({
    actorId: session.user.id,
    action: AuditAction.INVITE_CREATED,
    entityType: "invite",
    entityId: token,
    metadata: { email: parsed.data.email, brandId },
    ip: request.headers.get("x-forwarded-for") ?? undefined,
  });

  // Send invite email (non-blocking)
  sendInviteEmail({ to: parsed.data.email, token }).catch(console.error);

  return NextResponse.json({ sent: true }, { status: 201 });
}
