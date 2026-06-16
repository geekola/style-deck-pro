"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ROLES = [
  {
    key: "platform_admin",
    label: "Platform Admin",
    description: "Manage brands, users, and platform settings",
    destination: "/admin",
  },
  {
    key: "brand_admin",
    label: "Brand Admin",
    description: "Manage products, gifting, and customers",
    destination: "/brand",
  },
  {
    key: "customer",
    label: "Customer",
    description: "Discover and save products",
    destination: "/app/discover",
  },
] as const;

type Role = (typeof ROLES)[number]["key"];

export function DevSwitcher({
  currentRole,
  userName,
  userEmail,
}: {
  userId: string;
  currentRole: string;
  userName: string;
  userEmail: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function switchRole(role: Role) {
    setLoading(role);
    setError(null);

    try {
      const res = await fetch("/api/dev/switch-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Switch failed");
        return;
      }

      const { destination } =
        ROLES.find((r) => r.key === role) ?? ROLES[0];

      router.push(destination);
      router.refresh();
    } catch {
      setError("Network error — try again");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-6 bg-white dark:bg-gray-900 shadow-sm">
        {/* Header */}
        <div className="mb-6">
          <div className="inline-block bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-xs font-medium px-2 py-0.5 rounded mb-3">
            DEV ONLY
          </div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            Role Switcher
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {userName} · {userEmail}
          </p>
        </div>

        {/* Current role */}
        <div className="mb-5 text-xs text-gray-500 dark:text-gray-400">
          Current role:{" "}
          <span className="font-mono font-medium text-gray-900 dark:text-white">
            {currentRole}
          </span>
        </div>

        {/* Role buttons */}
        <div className="space-y-2">
          {ROLES.map((r) => {
            const isActive = r.key === currentRole;
            const isLoading = loading === r.key;

            return (
              <button
                key={r.key}
                onClick={() => switchRole(r.key)}
                disabled={!!loading}
                className={`w-full text-left rounded-lg border px-4 py-3 transition-colors disabled:opacity-60 ${
                  isActive
                    ? "border-black dark:border-white bg-gray-50 dark:bg-gray-800"
                    : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {r.label}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {r.description}
                    </div>
                  </div>
                  <div className="ml-3 shrink-0">
                    {isLoading ? (
                      <span className="text-xs text-gray-400">...</span>
                    ) : isActive ? (
                      <span className="text-xs font-medium text-gray-900 dark:text-white">
                        Active
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">Switch →</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {error && (
          <p className="mt-3 text-xs text-red-600 dark:text-red-400">{error}</p>
        )}

        <p className="mt-5 text-xs text-gray-400 dark:text-gray-500">
          Switches your account role and redirects to that role&apos;s dashboard.
          Changes take effect immediately — no re-login required.
        </p>
      </div>
    </div>
  );
}
