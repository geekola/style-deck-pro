import { requirePlatformAdmin } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { brands } from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import { BrandActions } from "./brand-actions";

export default async function AdminBrandsPage() {
  await requirePlatformAdmin();

  const allBrands = await db
    .select()
    .from(brands)
    .orderBy(asc(brands.createdAt));

  const pending = allBrands.filter((b) => b.status === "pending");
  const approved = allBrands.filter((b) => b.status === "approved");
  const rejected = allBrands.filter((b) => b.status === "rejected");

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-8">Brands</h1>

      {pending.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
            Pending review ({pending.length})
          </h2>
          <div className="space-y-3">
            {pending.map((b) => (
              <div key={b.id} className="border border-amber-200 bg-amber-50 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">{b.name}</div>
                    <div className="text-sm text-gray-600 capitalize">{b.category}</div>
                    <div className="text-sm text-gray-500 mt-1">{b.adminEmail}</div>
                  </div>
                  <BrandActions id={b.id} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mb-10">
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
          Approved ({approved.length})
        </h2>
        <BrandTable brands={approved} />
      </section>

      {rejected.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
            Rejected ({rejected.length})
          </h2>
          <BrandTable brands={rejected} />
        </section>
      )}
    </div>
  );
}

function BrandTable({ brands: rows }: { brands: typeof brands.$inferSelect[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-gray-400">None.</p>;
  }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left text-gray-500">
          <th className="pb-3 font-medium">Name</th>
          <th className="pb-3 font-medium">Category</th>
          <th className="pb-3 font-medium">Admin email</th>
          <th className="pb-3 font-medium">Registered</th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {rows.map((b) => (
          <tr key={b.id} className="hover:bg-gray-50">
            <td className="py-3 font-medium">{b.name}</td>
            <td className="py-3 capitalize text-gray-600">{b.category}</td>
            <td className="py-3 text-gray-600">{b.adminEmail}</td>
            <td className="py-3 text-gray-500">
              {new Date(b.createdAt).toLocaleDateString()}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
