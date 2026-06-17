import { db } from "@/lib/db";
import { platformSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Singleton platform settings row (id always 1). Returns null fields if the
 * row hasn't been created yet (e.g. migration not yet run).
 */
export async function getPlatformSettings() {
  const [row] = await db
    .select({
      companyName: platformSettings.companyName,
      logoUrl: platformSettings.logoUrl,
    })
    .from(platformSettings)
    .where(eq(platformSettings.id, 1))
    .limit(1);

  return {
    companyName: row?.companyName ?? null,
    logoUrl: row?.logoUrl ?? null,
  };
}

/**
 * Convenience helper for layouts that only need the platform logo URL.
 * Never throws -- falls back to null so a missing/un-migrated table doesn't
 * break page rendering.
 */
export async function getPlatformLogoUrl(): Promise<string | null> {
  try {
    const settings = await getPlatformSettings();
    return settings.logoUrl;
  } catch {
    return null;
  }
}
