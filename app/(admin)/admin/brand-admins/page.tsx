import { requirePlatformAdminPage } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { brandAdmins, brands, users } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { BrandAdminsTable } from "./brand-admins-table";

export default async function AdminBrandAdminsPage() {
  await requirePlatformAdminPage();

  const rows = await db
    .select({
      userId: users.id,
      name: users.name,
      email: users.email,
      status: users.status,
      joinedAt: brandAdmins.createdAt,
      brandId: brands.id,
      brandName: brands.name,
      brandCategory: brands.category,
      brandStatus: brands.status,
    })
    .from(brandAdmins)
    .innerJoin(users, eq(users.id, brandAdmins.userId))
    .innerJoin(brands, eq(brands.id, brandAdmins.brandId))
    .orderBy(desc(brandAdmins.createdAt));

  const data = rows.map((r) => ({ ...r, joinedAt: r.joinedAt.toISOString() }));

  const stats = {
    total: data.length,
    active: data.filter((r) => r.status === "active").length,
    suspended: data.filter((r) => r.status === "suspended").length,
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-8">Brand Admins</h1>
      <BrandAdminsTable rows={data} stats={stats} />
    </div>
  );
}
