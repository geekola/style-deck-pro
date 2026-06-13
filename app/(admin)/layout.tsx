import { DashboardNav } from "@/components/dashboard-nav";
import { getPlatformLogoUrl } from "@/lib/db/queries/platform-settings";

const links = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/brands", label: "Brands" },
  { href: "/admin/brand-admins", label: "Brand Admins" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/audit", label: "Audit Log" },
  { href: "/admin/account", label: "Account" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const logoUrl = await getPlatformLogoUrl();

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
      <DashboardNav title="StyleDeck Admin" links={links} logoUrl={logoUrl} />
      {children}
    </div>
  );
}
