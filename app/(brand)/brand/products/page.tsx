import Link from "next/link";
import { requireBrandAdmin } from "@/lib/auth-session";
import { getBrandProducts } from "@/lib/db/queries/brand";

export default async function BrandProductsPage() {
  const { brandId } = await requireBrandAdmin();
  const products = await getBrandProducts(brandId);

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">Products</h1>
        <div className="flex gap-3">
          <Link
            href="/brand/products/import"
            className="border border-gray-300 text-sm px-4 py-2 rounded-md hover:bg-gray-50"
          >
            Import CSV
          </Link>
          <Link
            href="/brand/products/new"
            className="bg-black text-white text-sm px-4 py-2 rounded-md hover:bg-gray-800"
          >
            Add product
          </Link>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          No products yet. Add your first product to get started.
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-3 font-medium">Name</th>
              <th className="pb-3 font-medium">Category</th>
              <th className="pb-3 font-medium">Type</th>
              <th className="pb-3 font-medium">Price</th>
              <th className="pb-3 font-medium">Status</th>
              <th className="pb-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="py-3 font-medium">{p.name}</td>
                <td className="py-3 capitalize text-gray-600">{p.category}</td>
                <td className="py-3 capitalize text-gray-600">{p.itemType}</td>
                <td className="py-3 text-gray-600">
                  {p.price != null ? `$${(p.price / 100).toFixed(2)}` : "—"}
                </td>
                <td className="py-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      p.active
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {p.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="py-3 text-right">
                  <Link
                    href={`/brand/products/${p.id}`}
                    className="text-gray-500 hover:text-black text-xs"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
