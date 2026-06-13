import { NextRequest, NextResponse } from "next/server";
import { requireBrandAdmin } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { brands } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { put, del } from "@vercel/blob";
import { getBrandById } from "@/lib/db/queries/brand";
import { audit, AuditAction } from "@/lib/audit";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

// POST /api/brand/logo
// Body: multipart/form-data with `file` field
export async function POST(request: NextRequest) {
  const session = await requireBrandAdmin();
  const { brandId } = session;

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

  const brand = await getBrandById(brandId);
  if (!brand) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const blob = await put(`brands/${brandId}/logo-${crypto.randomUUID()}-${file.name}`, file, {
    access: "public",
    contentType: file.type,
  });

  // Clean up the previous logo blob, if any
  if (brand.logoUrl) {
    await del(brand.logoUrl).catch(() => {});
  }

  await db.update(brands).set({ logoUrl: blob.url, updatedAt: new Date() }).where(eq(brands.id, brandId));

  await audit({
    actorId: session.session.user.id,
    action: AuditAction.BRAND_UPDATED,
    entityType: "brand",
    entityId: brandId,
    metadata: { logoUrl: blob.url },
  });

  return NextResponse.json({ logoUrl: blob.url }, { status: 201 });
}

// DELETE /api/brand/logo
export async function DELETE() {
  const session = await requireBrandAdmin();
  const { brandId } = session;

  const brand = await getBrandById(brandId);
  if (!brand) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (brand.logoUrl) {
    await del(brand.logoUrl).catch(() => {});
  }

  await db.update(brands).set({ logoUrl: null, updatedAt: new Date() }).where(eq(brands.id, brandId));

  await audit({
    actorId: session.session.user.id,
    action: AuditAction.BRAND_UPDATED,
    entityType: "brand",
    entityId: brandId,
    metadata: { logoUrl: null },
  });

  return new Response(null, { status: 204 });
}
