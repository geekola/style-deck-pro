import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCustomer } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { swipeEvents, savedProducts, customers, measurements } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const schema = z.object({
  productId: z.string().uuid(),
  direction: z.enum(["left", "right"]),
});

export async function POST(request: NextRequest) {
  const session = await requireCustomer();

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { productId, direction } = parsed.data;

  // Get customer record
  const [customer] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(eq(customers.userId, session.user.id))
    .limit(1);

  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  // Record the swipe (ignore conflicts — idempotent)
  await db
    .insert(swipeEvents)
    .values({ customerId: customer.id, productId, direction })
    .onConflictDoNothing();

  // Save on right swipe
  if (direction === "right") {
    await db
      .insert(savedProducts)
      .values({ customerId: customer.id, productId })
      .onConflictDoNothing();
  }

  return NextResponse.json({ recorded: true });
}
