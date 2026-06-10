import { redirect } from "next/navigation";
import { requireCustomer } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { customers, measurements } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { SwipeExperience } from "./swipe-experience";

export default async function DiscoverPage() {
  const session = await requireCustomer();

  const [customer] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(eq(customers.userId, session.user.id))
    .limit(1);

  if (!customer) redirect("/login");

  const [m] = await db
    .select({ id: measurements.id })
    .from(measurements)
    .where(eq(measurements.customerId, customer.id))
    .limit(1);

  const hasMeasurements = !!m;

  return (
    <SwipeExperience
      userName={session.user.name}
      hasMeasurements={hasMeasurements}
    />
  );
}
