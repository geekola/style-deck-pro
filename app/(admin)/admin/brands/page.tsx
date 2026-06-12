import { requirePlatformAdminPage } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { brands, brandAdmins, users } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";
import { BrandActions } from "./brand-actions";
import { AddAdminForm } from "./add-admin-form";
import { BrandAdminsList, type BrandAdmin } from "./brand-admins-list";

type Brand = typeof brands.$inferSelect;

function toBrandDetails(b: Brand) {
  return {
    name: b.name,
    category: b.category,
    adminEmail: b.adminEmail,
    fulfillmentEmail: b.fulfillmentEmail,
    accessPolicy: b.accessPolicy,
  };
}

export default async function AdminBrandsPage() {
  await requirePlatformAdminPage();

  const allBrands = await db
    .select()
    .from(brands)
    .orderBy(asc(brands.createdAt));

  const allBrandAdmins = await db
    .select({
      brandId: brandAdmins.brandId,
      userId: users.id,
      name: users.name,
      email: users.email,
      status: users.status,
    })
    .from(brandAdmins)
    .innerJoin(users, eq(users.id, brandAdmins.userId));

  function adminsFor(brandId: string): BrandAdmin[] {
    return allBrandAdmins.filter((a) => a.brandId === brandId);
  }

  const pending = allBrands.filter((b) => b.status === "pending");
  const approved = allBrands.filter((b) => b.status === "approved");
  const suspended = allBrands.filter((b) => b.status === "suspended");
  const rejected = allBrands.filter((b) => b.status === "rejected");

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-8">Brands</h1>

      {pending.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-4">
            Pending review ({pending.length})
          </h2>
          <div className="space-y-3">
            {pending.map((b) => (
              <div key={b.id} className="border border-amber-200 bg-amber-50 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">{b.name}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500 capitalize">{b.category}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">{b.adminEmail}</div>
                  </div>
                  <BrandActions id={b.id} status="pending" brand={toBrandDetails(b)} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mb-10">
        <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-4">
          Approved ({approved.length})
        </h2>
        {approved.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">None.</p>
        ) : (
          <div className="space-y-3">
            {approved.map((b) => (
              <div key={b.id} className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">{b.name}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500 capitalize">{b.category}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">{b.adminEmail}</div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
                      {new Date(b.createdAt).toLocaleDateString()}
                    </div>
                    <BrandActions id={b.id} status="approved" brand={toBrandDetails(b)} />
                  </div>
                </div>
                <AddAdminForm brandId={b.id} />
                <BrandAdminsList brandId={b.id} admins={adminsFor(b.id)} />
              </div>
            ))}
          </div>
        )}
      </section>

      {suspended.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-4">
            Suspended ({suspended.length})
          </h2>
          <div className="space-y-3">
            {suspended.map((b) => (
              <div key={b.id} className="border border-amber-200 bg-amber-50 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">{b.name}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500 capitalize">{b.category}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">{b.adminEmail}</div>
                    {b.statusReason && (
                      <div className="text-sm text-amber-700 mt-2">Reason: {b.statusReason}</div>
                    )}
                  </div>
                  <BrandActions id={b.id} status="suspended" brand={toBrandDetails(b)} />
                </div>
                <BrandAdminsList brandId={b.id} admins={adminsFor(b.id)} />
              </div>
            ))}
          </div>
        </section>
      )}

      {rejected.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-4">
            Rejected ({rejected.length})
          </h2>
          <div className="space-y-3">
            {rejected.map((b) => (
              <div key={b.id} className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">{b.name}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500 capitalize">{b.category}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">{b.adminEmail}</div>
                    {b.statusReason && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-2">Reason: {b.statusReason}</div>
                    )}
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
                      {new Date(b.createdAt).toLocaleDateString()}
                    </div>
                    <BrandActions id={b.id} status="rejected" brand={toBrandDetails(b)} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
