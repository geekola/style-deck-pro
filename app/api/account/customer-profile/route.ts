import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCustomer } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { customers, customerTypeEnum, industryEnum } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const updateSchema = z.object({
  type: z.enum(customerTypeEnum.enumValues),
  industry: z.enum(industryEnum.enumValues),
});

export async function GET() {
  const session = await requireCustomer();

  const [row] = await db
    .select({ type: customers.type, industry: customers.industry })
    .from(customers)
    .where(eq(customers.userId, session.user.id))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  return NextResponse.json(row);
}

export async function PUT(request: NextRequest) {
  const session = await requireCustomer();

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });
  }

  const result = await db
    .update(customers)
    .set({ type: parsed.data.type, industry: parsed.data.industry })
    .where(eq(customers.userId, session.user.id))
    .returning({ id: customers.id });

  if (result.length === 0) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  return NextResponse.json({ saved: true });
}
