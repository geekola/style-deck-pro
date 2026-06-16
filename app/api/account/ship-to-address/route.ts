import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCustomer } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const addressSchema = z.object({
  line1: z.string().trim().min(1).max(200),
  line2: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().min(1).max(100),
  postalCode: z.string().trim().min(1).max(20),
  country: z.string().trim().length(2),
});

export async function GET() {
  const session = await requireCustomer();

  const [row] = await db
    .select({ shipToAddress: users.shipToAddress })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  return NextResponse.json(row?.shipToAddress ?? null);
}

export async function PUT(request: NextRequest) {
  const session = await requireCustomer();

  const body = await request.json().catch(() => null);

  // Allow clearing the address by sending null
  if (body === null) {
    await db
      .update(users)
      .set({ shipToAddress: null })
      .where(eq(users.id, session.user.id));
    return NextResponse.json({ saved: true });
  }

  const parsed = addressSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });
  }

  const addr = {
    line1: parsed.data.line1,
    ...(parsed.data.line2 ? { line2: parsed.data.line2 } : {}),
    city: parsed.data.city,
    state: parsed.data.state,
    postalCode: parsed.data.postalCode,
    country: parsed.data.country,
  };

  await db
    .update(users)
    .set({ shipToAddress: addr })
    .where(eq(users.id, session.user.id));

  return NextResponse.json({ saved: true });
}
