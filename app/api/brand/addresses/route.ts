import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireBrandAdmin } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { brands } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const addressSchema = z.object({
  line1: z.string().trim().min(1).max(200),
  line2: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().min(1).max(100),
  postalCode: z.string().trim().min(1).max(20),
  country: z.string().trim().length(2),
});

const bodySchema = z.object({
  address: addressSchema.nullable().optional(),
  returnAddress: addressSchema.nullable().optional(),
  fulfillmentAddress: addressSchema.nullable().optional(),
});

export async function GET() {
  const { brandId } = await requireBrandAdmin();

  const [row] = await db
    .select({ address: brands.address, returnAddress: brands.returnAddress, fulfillmentAddress: brands.fulfillmentAddress })
    .from(brands)
    .where(eq(brands.id, brandId))
    .limit(1);

  return NextResponse.json(row ?? { address: null, returnAddress: null, fulfillmentAddress: null });
}

export async function PUT(request: NextRequest) {
  const { brandId } = await requireBrandAdmin();

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });
  }

  type AddrValue = { line1: string; line2?: string; city: string; state: string; postalCode: string; country: string } | null;

  function toAddr(raw: z.infer<typeof addressSchema> | null | undefined): AddrValue {
    if (!raw) return null;
    return {
      line1: raw.line1,
      ...(raw.line2 ? { line2: raw.line2 } : {}),
      city: raw.city,
      state: raw.state,
      postalCode: raw.postalCode,
      country: raw.country,
    };
  }

  const update: Record<string, AddrValue> = {};
  if ("address" in parsed.data) update.address = toAddr(parsed.data.address ?? null);
  if ("returnAddress" in parsed.data) update.returnAddress = toAddr(parsed.data.returnAddress ?? null);
  if ("fulfillmentAddress" in parsed.data) update.fulfillmentAddress = toAddr(parsed.data.fulfillmentAddress ?? null);

  await db.update(brands).set(update).where(eq(brands.id, brandId));

  return NextResponse.json({ saved: true });
}
