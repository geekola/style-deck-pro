"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import { ThemeToggle } from "@/components/theme-toggle";

export type NavLink = {
  href: string;
  label: string;
  /** Match this link only on an exact pathname match (use for the section root). */
  exact?: boolean;
};

export function DashboardNav({
  title,
  links,
}: {
  title: string;
  links: NavLink[];
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    // Clear the role cookie used by middleware for fast route checks.
    document.cookie = "sd_role=; path=/; max-age=0";
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-semibold text-gray-900 dark:text-white">{title}</span>
          <div className="flex items-center gap-1">
            {links.map((link) => {
              const active = link.exact
                ? pathname === link.href
                : pathname === link.href || pathname.startsWith(link.href + "/");
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm px-3 py-1.5 rounded-md transition-colors ${
                    active
                      ? "bg-gray-100 dark:bg-gray-800 font-medium text-gray-900 dark:text-white"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            onClick={handleSignOut}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
