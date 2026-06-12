import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth-session";
import { completeInvite, CUSTOMER_TYPE_VALUES, INDUSTRY_VALUES } from "@/lib/complete-invite";

const schema = z.object({
  token: z.string().min(1),
  type: z.enum(CUSTOMER_TYPE_VALUES),
  industry: z.enum(INDUSTRY_VALUES),
});

/**
 * POST /api/auth/complete-invite
 * Called after a customer signs up via an invite link and has an active
 * session (i.e. email verification isn't required, or they've already
 * verified). Creates their customer record, marks the invite accepted, and
 * grants brand_access if applicable.
 *
 * When email verification is required, this same logic instead runs from
 * /api/auth/finalize after the user verifies their email and is auto-signed-in.
 */
export async function POST(request: NextRequest) {
  const session = await requireSession();

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const result = await completeInvite({
    session,
    ...parsed.data,
    ip: request.headers.get("x-forwarded-for") ?? undefined,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true });
}
