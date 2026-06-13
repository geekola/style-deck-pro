import { NextResponse } from "next/server";
import { requireBrandAdmin } from "@/lib/auth-session";
import { getBrandById } from "@/lib/db/queries/brand";

/**
 * GET /api/brand
 *
 * Returns basic info about the current brand admin's brand, including
 * branding (logoUrl). Never returns cost/financial data.
 */
export async function GET() {
  const { brandId } = await requireBrandAdmin();

  const brand = await getBrandById(brandId);
  if (!brand) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    id: brand.id,
    name: brand.name,
    category: brand.category,
    status: brand.status,
    logoUrl: brand.logoUrl,
  });
}
