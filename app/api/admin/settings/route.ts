import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth-session";
import { getPlatformSettings } from "@/lib/db/queries/platform-settings";
import { db } from "@/lib/db";
import { platformSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * GET /api/admin/settings
 *
 * Returns platform-wide settings (branding, company name).
 * Platform admin only.
 */
export async function GET() {
  await requirePlatformAdmin();

  const settings = await getPlatformSettings();

  return NextResponse.json({
    companyName: settings.companyName,
    logoUrl: settings.logoUrl,
  });
}

/**
 * PATCH /api/admin/settings
 *
 * Update platform-wide settings. Currently supports: companyName.
 * Upserts the singleton row (id=1).
 */
export async function PATCH(request: NextRequest) {
  await requirePlatformAdmin();

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const updates: { companyName?: string | null; updatedAt: Date } = {
    updatedAt: new Date(),
  };

  if ("companyName" in body) {
    updates.companyName = typeof body.companyName === "string" ? body.companyName.trim() || null : null;
  }

  await db
    .insert(platformSettings)
    .values({ id: 1, ...updates })
    .onConflictDoUpdate({ target: platformSettings.id, set: updates });

  const settings = await getPlatformSettings();

  return NextResponse.json({
    companyName: settings.companyName,
    logoUrl: settings.logoUrl,
  });
}
