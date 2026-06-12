import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { customers, customerContacts } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

/**
 * Read-only list of a customer's secondary contacts for platform admins.
 * Admins cannot create, edit, or delete contacts here -- this is informational
 * only (e.g. to find an assistant's email for support purposes).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requirePlatformAdmin();
  const { id } = await params;

  const [customer] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(eq(customers.userId, id))
    .limit(1);

  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  const rows = await db
    .select()
    .from(customerContacts)
    .where(eq(customerContacts.customerId, customer.id))
    .orderBy(asc(customerContacts.createdAt));

  return NextResponse.json(rows);
}
