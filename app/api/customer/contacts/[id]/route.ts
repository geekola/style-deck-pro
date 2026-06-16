import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCustomer } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { customers, customerContacts } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

const contactSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().max(100).default(""),
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
    firstName: data.firstName,
    lastName: data.lastName ?? "",
    name: [data.firstName, data.lastName].filter(Boolean).join(" ") || null,
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireCustomer();
  const { id } = await params;

  const customerId = await getCustomerId(session.user.id);
  if (!customerId) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });
  }

  const [row] = await db
    .update(customerContacts)
    .set(toRow(parsed.data))
    .where(and(eq(customerContacts.id, id), eq(customerContacts.customerId, customerId)))
    .returning();

  if (!row) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

  return NextResponse.json(row);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireCustomer();
  const { id } = await params;

  const customerId = await getCustomerId(session.user.id);
  if (!customerId) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  const result = await db
    .delete(customerContacts)
    .where(and(eq(customerContacts.id, id), eq(customerContacts.customerId, customerId)))
    .returning({ id: customerContacts.id });

  if (result.length === 0) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

  return NextResponse.json({ deleted: true });
}
