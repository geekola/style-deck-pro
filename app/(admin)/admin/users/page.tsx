import { requirePlatformAdmin } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { users, customers } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { UserActions } from "./user-actions";

export default async function AdminUsersPage() {
  await requirePlatformAdmin();

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      emailVerified: users.emailVerified,
      createdAt: users.createdAt,
      customerType: customers.type,
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
          <tr className="border-b text-left text-gray-500">
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
            <tr key={u.id} className="hover:bg-gray-50">
              <td className="py-3">
                <div className="font-medium">{u.name}</div>
                <div className="text-xs text-gray-400">{u.email}</div>
              </td>
              <td className="py-3 capitalize text-gray-600">{u.role.replace("_", " ")}</td>
              <td className="py-3 capitalize text-gray-600">{u.customerType ?? "—"}</td>
              <td className="py-3">
                {u.customerStatus ? (
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      u.customerStatus === "active"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {u.customerStatus}
                  </span>
                ) : (
                  <span className="text-gray-400 text-xs">—</span>
                )}
              </td>
              <td className="py-3 text-gray-500 text-xs">
                {new Date(u.createdAt).toLocaleDateString()}
              </td>
              <td className="py-3 text-right">
                {u.role === "customer" && u.customerStatus && (
                  <UserActions
                    userId={u.id}
                    currentStatus={u.customerStatus}
                  />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
