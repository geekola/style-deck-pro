import Link from "next/link";
import { requireBrandAdminPage } from "@/lib/auth-session";
import { getBrandProducts, getBrandOrders } from "@/lib/db/queries/brand";
import { getBrandById } from "@/lib/db/queries/brand";

export default async function BrandDashboardPage() {
  const { brandId } = await requireBrandAdminPage();
  const [brand, products, orders] = await Promise.all([
    getBrandById(brandId),
    getBrandProducts(brandId),
    getBrandOrders(brandId),
  ]);

  const activeProducts = products.filter((p) => p.active).length;
  const pendingOrders = orders.filter((o) => o.status === "pending").length;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-2">{brand?.name}</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 capitalize mb-10">{brand?.category} · {brand?.accessPolicy?.replace("_", " ")} access</p>

      <div className="grid grid-cols-3 gap-4 mb-10">
        <Stat label="Active products" value={activeProducts} href="/brand/products" />
        <Stat label="Total products" value={products.length} href="/brand/products" />
        <Stat label="Pending orders" value={pendingOrders} href="/brand/orders#needs-shipping" />
      </div>

      <nav className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { href: "/brand/products", label: "Products" },
          { href: "/brand/customers", label: "Customers" },
          { href: "/brand/gifting", label: "Gifting" },
          { href: "/brand/orders", label: "Orders" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800/60 dark:bg-gray-900 text-center"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link
      href={href}
      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors block"
    >
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">{label}</div>
    </Link>
  );
}
