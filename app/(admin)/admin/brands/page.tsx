import { requirePlatformAdminPage } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { brands, brandAdmins, users } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { BrandsTable } from "./brands-table";

export default async function AdminBrandsPage() {
  await requirePlatformAdminPage();

  const allBrands = await db.select().from(brands).orderBy(desc(brands.createdAt));

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

  const rows = allBrands.map((b) => ({
    id: b.id,
    name: b.name,
    category: b.category,
    adminEmail: b.adminEmail,
    fulfillmentEmail: b.fulfillmentEmail,
    accessPolicy: b.accessPolicy,
    status: b.status,
    statusReason: b.statusReason,
    createdAt: b.createdAt.toISOString(),
    admins: allBrandAdmins.filter((a) => a.brandId === b.id),
  }));

  const stats = {
    total: rows.length,
    pending: rows.filter((b) => b.status === "pending").length,
    approved: rows.filter((b) => b.status === "approved").length,
    suspended: rows.filter((b) => b.status === "suspended").length,
    rejected: rows.filter((b) => b.status === "rejected").length,
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-8">Brands</h1>
      <BrandsTable rows={rows} stats={stats} />
    </div>
  );
}
