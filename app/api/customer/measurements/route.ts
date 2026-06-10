import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCustomer } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { measurements, customers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const updateSchema = z.object({
  gender: z.enum(["male", "female"]).optional(),
  unitSystem: z.enum(["metric", "imperial"]).optional(),
  // Core fields
  height: z.string().max(20).optional().nullable(),
  weight: z.string().max(20).optional().nullable(),
  shoeSize: z.string().max(20).optional().nullable(),
  shoeWidth: z.string().max(20).optional().nullable(),
  chest: z.string().max(20).optional().nullable(),
  waist: z.string().max(20).optional().nullable(),
  hips: z.string().max(20).optional().nullable(),
  neck: z.string().max(20).optional().nullable(),
  shoulderWidth: z.string().max(20).optional().nullable(),
  sleeveLength: z.string().max(20).optional().nullable(),
  inseam: z.string().max(20).optional().nullable(),
  // Extended fields — any key-value pairs
  extended: z.record(z.string().max(100)).optional(),
});

async function getCustomerId(userId: string) {
  const [c] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(eq(customers.userId, userId))
    .limit(1);
  return c?.id ?? null;
}

export async function GET() {
  const session = await requireCustomer();
  const customerId = await getCustomerId(session.user.id);
  if (!customerId) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  const [m] = await db
    .select()
    .from(measurements)
    .where(eq(measurements.customerId, customerId))
    .limit(1);

  return NextResponse.json(m ?? null);
}

export async function PUT(request: NextRequest) {
  const session = await requireCustomer();
  const customerId = await getCustomerId(session.user.id);
  if (!customerId) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await db
    .select({ id: measurements.id })
    .from(measurements)
    .where(eq(measurements.customerId, customerId))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(measurements)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(measurements.customerId, customerId));
  } else {
    await db.insert(measurements).values({ customerId, ...parsed.data });
  }

  return NextResponse.json({ saved: true });
}
