import { DashboardNav } from "@/components/dashboard-nav";

const links = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/brands", label: "Brands" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/audit", label: "Audit Log" },
  { href: "/admin/account", label: "Account" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
      <DashboardNav title="StyleDeck Admin" links={links} />
      {children}
    </div>
  );
}
