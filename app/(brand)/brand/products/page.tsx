import Link from "next/link";
import { requireBrandAdminPage } from "@/lib/auth-session";
import { getBrandProducts } from "@/lib/db/queries/brand";
import { ProductsTable } from "./products-table";

export default async function BrandProductsPage() {
  const { brandId } = await requireBrandAdminPage();
  const allProducts = await getBrandProducts(brandId);

  const rows = allProducts.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    itemType: p.itemType,
    description: p.description,
    price: p.price,
    costPrice: p.costPrice,
    returnPolicy: p.returnPolicy,
    active: p.active,
    createdAt: p.createdAt.toISOString(),
  }));

  const stats = {
    total: rows.length,
    active: rows.filter((p) => p.active).length,
    inactive: rows.filter((p) => !p.active).length,
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">Products</h1>
        <div className="flex gap-3">
          <Link
            href="/brand/products/import"
            className="border border-gray-300 dark:border-gray-600 text-sm px-4 py-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/60 dark:bg-gray-900"
          >
            Import CSV
          </Link>
          <Link
            href="/brand/products/new"
            className="bg-black dark:bg-white dark:text-black text-white text-sm px-4 py-2 rounded-md hover:bg-gray-800"
          >
            Add product
          </Link>
        </div>
      </div>

      <ProductsTable rows={rows} stats={stats} />
    </div>
  );
}
