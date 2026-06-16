import Link from "next/link";
import { redirect } from "next/navigation";
import { requireCustomerPage } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { customers, customerContacts, measurements } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { SwipeExperience } from "./swipe-experience";

export default async function DiscoverPage() {
  const session = await requireCustomerPage();

  const [customer] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(eq(customers.userId, session.user.id))
    .limit(1);

  if (!customer) redirect("/login");

  const [contact] = await db
    .select({ id: customerContacts.id })
    .from(customerContacts)
    .where(eq(customerContacts.customerId, customer.id))
    .limit(1);

  if (!contact) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center px-6">
        <div className="max-w-sm text-center">
          <div className="text-4xl mb-4">✦</div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Complete your profile
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Add at least one additional contact to activate your account and start discovering.
          </p>
          <Link
            href="/app/account"
            className="inline-block px-6 py-3 rounded-xl text-sm font-medium text-white bg-black dark:bg-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
          >
            Go to Profile
          </Link>
        </div>
      </div>
    );
  }

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
