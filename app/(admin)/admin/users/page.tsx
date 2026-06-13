import { requirePlatformAdminPage } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { users, customers } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { UsersTable } from "./users-table";

export default async function AdminUsersPage() {
  await requirePlatformAdminPage();

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
      customerType: customers.type,
      customerIndustry: customers.industry,
      customerStatus: customers.status,
    })
    .from(users)
    .leftJoin(customers, eq(customers.userId, users.id))
    .orderBy(desc(users.createdAt));

  const stats = {
    total: rows.length,
    customers: rows.filter((u) => u.role === "customer").length,
    brandAdmins: rows.filter((u) => u.role === "brand_admin").length,
    suspended: rows.filter((u) => u.customerStatus === "suspended").length,
  };

  const tableRows = rows.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    customerType: u.customerType,
    customerIndustry: u.customerIndustry,
    customerStatus: u.customerStatus,
    joinedAt: u.createdAt.toISOString(),
  }));

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-8">Users</h1>
      <UsersTable rows={tableRows} stats={stats} />
    </div>
  );
}
