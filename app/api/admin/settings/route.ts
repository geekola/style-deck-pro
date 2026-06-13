import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth-session";
import { getPlatformSettings } from "@/lib/db/queries/platform-settings";

/**
 * GET /api/admin/settings
 *
 * Returns platform-wide settings (currently just branding/logoUrl).
 * Platform admin only.
 */
export async function GET() {
  await requirePlatformAdmin();

  const settings = await getPlatformSettings();

  return NextResponse.json({ logoUrl: settings.logoUrl });
}
