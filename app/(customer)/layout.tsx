import { DashboardNav } from "@/components/dashboard-nav";

const links = [
  { href: "/app/discover", label: "Discover", exact: true },
  { href: "/app/saved", label: "Saved" },
  { href: "/app/orders", label: "Orders" },
  { href: "/app/profile", label: "Profile" },
  { href: "/app/account", label: "Account" },
];

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <DashboardNav title="StyleDeck" links={links} />
      {children}
    </div>
  );
}
