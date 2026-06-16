"use client";

import { useState } from "react";

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
  const [loading, setLoading] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [iframeRole, setIframeRole] = useState<{ role: Role; destination: string } | null>(null);

  async function switchRole(role: Role, openInIframe = false) {
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

      const target = ROLES.find((r) => r.key === role)!;

      if (openInIframe) {
        setIframeRole({ role, destination: target.destination });
      } else {
        // Hard navigation — bypasses Next.js router cache so cookies are picked up fresh
        window.location.href = target.destination;
      }
    } catch {
      setError("Network error — try again");
    } finally {
      setLoading(null);
    }
  }

  if (iframeRole) {
    return (
      <div className="fixed inset-0 flex flex-col bg-white dark:bg-gray-950">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shrink-0">
          <span className="inline-block bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-xs font-medium px-2 py-0.5 rounded">
            DEV
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
            {iframeRole.role}
          </span>
          <div className="flex gap-1 ml-auto">
            {ROLES.map((r) => (
              <button
                key={r.key}
                disabled={!!loading}
                onClick={() => switchRole(r.key, true)}
                className={`text-xs px-3 py-1 rounded-md transition-colors disabled:opacity-50 ${
                  iframeRole.role === r.key
                    ? "bg-black dark:bg-white text-white dark:text-black"
                    : "border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60"
                }`}
              >
                {loading === r.key ? "..." : r.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setIframeRole(null)}
            className="text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 ml-2"
          >
            ✕ Exit
          </button>
        </div>

        {error && (
          <div className="px-4 py-1 text-xs text-red-600 bg-red-50 border-b border-red-100">
            {error}
          </div>
        )}

        <iframe
          key={iframeRole.role + iframeRole.destination}
          src={iframeRole.destination}
          className="flex-1 w-full border-0"
        />
      </div>
    );
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
              <div key={r.key} className={`rounded-lg border transition-colors ${
                isActive
                  ? "border-black dark:border-white bg-gray-50 dark:bg-gray-800"
                  : "border-gray-200 dark:border-gray-700"
              }`}>
                <div className="px-4 py-3">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {r.label}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {r.description}
                  </div>
                </div>
                <div className="flex border-t border-gray-100 dark:border-gray-800">
                  <button
                    onClick={() => switchRole(r.key, false)}
                    disabled={!!loading}
                    className="flex-1 text-xs py-2 hover:bg-gray-50 dark:hover:bg-gray-800/60 disabled:opacity-50 transition-colors rounded-bl-lg text-gray-600 dark:text-gray-400"
                  >
                    {isLoading ? "Switching..." : "Open →"}
                  </button>
                  <div className="w-px bg-gray-100 dark:bg-gray-800" />
                  <button
                    onClick={() => switchRole(r.key, true)}
                    disabled={!!loading}
                    className="flex-1 text-xs py-2 hover:bg-gray-50 dark:hover:bg-gray-800/60 disabled:opacity-50 transition-colors rounded-br-lg text-gray-600 dark:text-gray-400"
                  >
                    {isLoading ? "..." : "Preview ⊡"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {error && (
          <p className="mt-3 text-xs text-red-600 dark:text-red-400">{error}</p>
        )}

        <p className="mt-5 text-xs text-gray-400 dark:text-gray-500">
          <strong>Open</strong> navigates to that role&apos;s dashboard.{" "}
          <strong>Preview</strong> loads it in an inline frame — switch roles without leaving this page.
        </p>
      </div>
    </div>
  );
}
