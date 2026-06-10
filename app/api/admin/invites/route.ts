import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { invites } from "@/lib/db/schema";
import { audit, AuditAction } from "@/lib/audit";
import { sendInviteEmail } from "@/lib/email";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  const session = await requirePlatformAdmin();

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.insert(invites).values({
    email: parsed.data.email,
    source: "platform_admin",
    brandId: null,
    token,
    expiresAt,
  });

  await audit({
    actorId: session.user.id,
    action: AuditAction.INVITE_CREATED,
    entityType: "invite",
    entityId: token,
    metadata: { email: parsed.data.email, source: "platform_admin" },
    ip: request.headers.get("x-forwarded-for") ?? undefined,
  });

  sendInviteEmail({ to: parsed.data.email, token }).catch(console.error);

  return NextResponse.json({ sent: true }, { status: 201 });
}
