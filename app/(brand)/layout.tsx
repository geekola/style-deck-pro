import { DashboardNav } from "@/components/dashboard-nav";

const links = [
  { href: "/brand", label: "Dashboard", exact: true },
  { href: "/brand/products", label: "Products" },
  { href: "/brand/orders", label: "Orders" },
  { href: "/brand/gifting", label: "Gifting" },
  { href: "/brand/customers", label: "Customers" },
  { href: "/brand/account", label: "Account" },
];

export default function BrandLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <DashboardNav title="StyleDeck Brand" links={links} />
      {children}
    </div>
  );
}
