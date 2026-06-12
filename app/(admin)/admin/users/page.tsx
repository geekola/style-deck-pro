import { requirePlatformAdminPage } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { users, customers } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { UserRow } from "./user-row";

export default async function AdminUsersPage() {
  await requirePlatformAdminPage();

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      emailVerified: users.emailVerified,
      createdAt: users.createdAt,
      customerType: customers.type,
      customerIndustry: customers.industry,
      customerStatus: customers.status,
    })
    .from(users)
    .leftJoin(customers, eq(customers.userId, users.id))
    .orderBy(desc(users.createdAt));

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-8">Users</h1>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500 dark:text-gray-400 dark:text-gray-500">
            <th className="pb-3 font-medium">Name</th>
            <th className="pb-3 font-medium">Role</th>
            <th className="pb-3 font-medium">Type</th>
            <th className="pb-3 font-medium">Status</th>
            <th className="pb-3 font-medium">Joined</th>
            <th className="pb-3" />
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((u) => (
            <UserRow
              key={u.id}
              user={{
                id: u.id,
                name: u.name,
                email: u.email,
                role: u.role,
                customerType: u.customerType,
                customerIndustry: u.customerIndustry,
                customerStatus: u.customerStatus,
                joinedDate: new Date(u.createdAt).toLocaleDateString(),
              }}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
