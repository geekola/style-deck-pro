import { DashboardNav } from "@/components/dashboard-nav";
import { getPlatformLogoUrl } from "@/lib/db/queries/platform-settings";

const links = [
  { href: "/app/discover", label: "Discover", exact: true },
  { href: "/app/saved", label: "Saved" },
  { href: "/app/orders", label: "Orders" },
  { href: "/app/account", label: "Profile" },
];

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const logoUrl = await getPlatformLogoUrl();

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <DashboardNav title="StyleDeck" links={links} logoUrl={logoUrl} />
      {children}
    </div>
  );
}
