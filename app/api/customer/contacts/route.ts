import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCustomer } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { customers, customerContacts } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

const contactSchema = z.object({
  name: z.string().trim().min(1).max(200),
  role: z.string().trim().max(100).optional().or(z.literal("")),
  email: z.string().trim().toLowerCase().email().optional().or(z.literal("")),
  phone: z.string().trim().max(50).optional().or(z.literal("")),
  addressLine1: z.string().trim().max(200).optional().or(z.literal("")),
  addressLine2: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().max(100).optional().or(z.literal("")),
  state: z.string().trim().max(100).optional().or(z.literal("")),
  postalCode: z.string().trim().max(20).optional().or(z.literal("")),
  country: z.string().trim().max(2).optional().or(z.literal("")),
});

function toRow(data: z.infer<typeof contactSchema>) {
  return {
    name: data.name,
    role: data.role || null,
    email: data.email || null,
    phone: data.phone || null,
    addressLine1: data.addressLine1 || null,
    addressLine2: data.addressLine2 || null,
    city: data.city || null,
    state: data.state || null,
    postalCode: data.postalCode || null,
    country: data.country || null,
  };
}

async function getCustomerId(userId: string) {
  const [row] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(eq(customers.userId, userId))
    .limit(1);
  return row?.id;
}

export async function GET() {
  const session = await requireCustomer();

  const customerId = await getCustomerId(session.user.id);
  if (!customerId) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  const rows = await db
    .select()
    .from(customerContacts)
    .where(eq(customerContacts.customerId, customerId))
    .orderBy(asc(customerContacts.createdAt));

  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const session = await requireCustomer();

  const customerId = await getCustomerId(session.user.id);
  if (!customerId) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });
  }

  const [row] = await db
    .insert(customerContacts)
    .values({ customerId, ...toRow(parsed.data) })
    .returning();

  return NextResponse.json(row, { status: 201 });
}
