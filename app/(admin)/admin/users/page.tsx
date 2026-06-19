import { requirePlatformAdminPage } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { users, customers } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { UsersTable } from "./users-table";
import { InviteButton } from "./invite-button";

export default async function AdminUsersPage() {
  await requirePlatformAdminPage();

  const [rows, brandAdminRows] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        createdAt: users.createdAt,
        customerType: customers.type,
        customerIndustry: customers.industry,
        customerStatus: customers.status,
      })
      .from(customers)
      .innerJoin(users, eq(users.id, customers.userId))
      .orderBy(desc(users.createdAt)),

    db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, "brand_admin")),
  ]);

  const stats = {
    total: rows.length,
    active: rows.filter((u) => u.customerStatus === "active").length,
    suspended: rows.filter((u) => u.customerStatus === "suspended").length,
    brandAdmins: brandAdminRows.length,
  };

  const tableRows = rows.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    customerType: u.customerType,
    customerIndustry: u.customerIndustry,
    customerStatus: u.customerStatus,
    joinedAt: u.createdAt.toISOString(),
  }));

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
      <h1 className="text-2xl font-semibold">Clients</h1>
      <InviteButton />
    </div>
      <UsersTable rows={tableRows} stats={stats} />
    </div>
  );
}
