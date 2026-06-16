import { NextRequest, NextResponse } from "next/server";
import { requireBrandAdmin } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { productImages } from "@/lib/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { put, del } from "@vercel/blob";
import { getBrandProduct } from "@/lib/db/queries/brand";

// POST /api/brand/products/images?productId=xxx
// Body: multipart/form-data with `file` field
export async function POST(request: NextRequest) {
  const { brandId } = await requireBrandAdmin();
  const productId = request.nextUrl.searchParams.get("productId");

  if (!productId) {
    return NextResponse.json({ error: "productId required" }, { status: 400 });
  }

  const product = await getBrandProduct(brandId, productId);
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: "Only JPEG, PNG, and WebP images are allowed" },
      { status: 400 }
    );
  }

  const MAX_SIZE = 10 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 400 });
  }

  const blob = await put(`products/${productId}/${crypto.randomUUID()}-${file.name}`, file, {
    access: "public",
    contentType: file.type,
  });

  const existing = await db
    .select({ id: productImages.id })
    .from(productImages)
    .where(eq(productImages.productId, productId));

  const [image] = await db
    .insert(productImages)
    .values({
      productId,
      url: blob.url,
      hero: existing.length === 0,
      displayOrder: existing.length,
    })
    .returning({ id: productImages.id, url: productImages.url, hero: productImages.hero });

  return NextResponse.json(image, { status: 201 });
}

// PUT /api/brand/products/images?imageId=xxx
// Sets the given image as the hero for its product (clears others).
export async function PUT(request: NextRequest) {
  const { brandId } = await requireBrandAdmin();
  const imageId = request.nextUrl.searchParams.get("imageId");

  if (!imageId) {
    return NextResponse.json({ error: "imageId required" }, { status: 400 });
  }

  const [image] = await db
    .select({ id: productImages.id, productId: productImages.productId })
    .from(productImages)
    .where(eq(productImages.id, imageId))
    .limit(1);

  if (!image) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const product = await getBrandProduct(brandId, image.productId);
  if (!product) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await db
    .update(productImages)
    .set({ hero: false })
    .where(and(eq(productImages.productId, image.productId), ne(productImages.id, imageId)));

  await db
    .update(productImages)
    .set({ hero: true })
    .where(eq(productImages.id, imageId));

  return new Response(null, { status: 204 });
}

// DELETE /api/brand/products/images?imageId=xxx
export async function DELETE(request: NextRequest) {
  const { brandId } = await requireBrandAdmin();
  const imageId = request.nextUrl.searchParams.get("imageId");

  if (!imageId) {
    return NextResponse.json({ error: "imageId required" }, { status: 400 });
  }

  const [image] = await db
    .select({
      id: productImages.id,
      url: productImages.url,
      productId: productImages.productId,
    })
    .from(productImages)
    .where(eq(productImages.id, imageId))
    .limit(1);

  if (!image) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const product = await getBrandProduct(brandId, image.productId);
  if (!product) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Best-effort blob deletion — don't let blob errors block the DB delete
  try {
    await del(image.url);
  } catch {
    // Log but continue — orphaned blob is preferable to a broken UI
    console.warn("Failed to delete blob:", image.url);
  }
  await db.delete(productImages).where(eq(productImages.id, imageId));

  return new Response(null, { status: 204 });
}
