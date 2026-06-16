import { DashboardNav } from "@/components/dashboard-nav";
import { getPlatformLogoUrl } from "@/lib/db/queries/platform-settings";

const links = [
  { href: "/brand", label: "Dashboard", exact: true },
  { href: "/brand/products", label: "Products" },
  { href: "/brand/orders", label: "Orders" },
  { href: "/brand/gifting", label: "Gifting" },
  { href: "/brand/customers", label: "Clients" },
  { href: "/brand/account", label: "Account" },
];

export default async function BrandLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const logoUrl = await getPlatformLogoUrl();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <DashboardNav title="StyleDeck Brand" links={links} logoUrl={logoUrl} />
      {children}
    </div>
  );
}
