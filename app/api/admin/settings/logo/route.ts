import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { platformSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { put, del } from "@vercel/blob";
import { getPlatformSettings } from "@/lib/db/queries/platform-settings";
import { audit, AuditAction } from "@/lib/audit";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

// POST /api/admin/settings/logo
// Body: multipart/form-data with `file` field
export async function POST(request: NextRequest) {
  const session = await requirePlatformAdmin();

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Only JPEG, PNG, WebP, and SVG images are allowed" },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File too large (max 2 MB)" }, { status: 400 });
  }

  const settings = await getPlatformSettings();

  const blob = await put(`platform/logo-${crypto.randomUUID()}-${file.name}`, file, {
    access: "public",
    contentType: file.type,
  });

  // Clean up the previous logo blob, if any
  if (settings.logoUrl) {
    await del(settings.logoUrl).catch(() => {});
  }

  await db
    .insert(platformSettings)
    .values({ id: 1, logoUrl: blob.url, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: platformSettings.id,
      set: { logoUrl: blob.url, updatedAt: new Date() },
    });

  await audit({
    actorId: session.user.id,
    action: AuditAction.PLATFORM_SETTINGS_UPDATED,
    entityType: "platform_settings",
    entityId: "1",
    metadata: { logoUrl: blob.url },
  });

  return NextResponse.json({ logoUrl: blob.url }, { status: 201 });
}

// DELETE /api/admin/settings/logo
export async function DELETE() {
  const session = await requirePlatformAdmin();

  const settings = await getPlatformSettings();

  if (settings.logoUrl) {
    await del(settings.logoUrl).catch(() => {});
  }

  await db
    .insert(platformSettings)
    .values({ id: 1, logoUrl: null, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: platformSettings.id,
      set: { logoUrl: null, updatedAt: new Date() },
    });

  await audit({
    actorId: session.user.id,
    action: AuditAction.PLATFORM_SETTINGS_UPDATED,
    entityType: "platform_settings",
    entityId: "1",
    metadata: { logoUrl: null },
  });

  return new Response(null, { status: 204 });
}
