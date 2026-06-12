"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type BrandAdmin = {
  userId: string;
  name: string;
  email: string;
  status: "active" | "suspended";
};

export function BrandAdminsList({ brandId, admins }: { brandId: string; admins: BrandAdmin[] }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (admins.length === 0) return null;

  async function toggleSuspend(admin: BrandAdmin) {
    setLoadingId(admin.userId);
    setError(null);
    const newStatus = admin.status === "active" ? "suspended" : "active";
    try {
      const res = await fetch(`/api/admin/brands/${brandId}/admins/${admin.userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Something went wrong");
        return;
      }
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoadingId(null);
    }
  }

  async function remove(admin: BrandAdmin) {
    if (!confirm(`Remove ${admin.email} as a brand admin for this brand?`)) return;
    setLoadingId(admin.userId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/brands/${brandId}/admins/${admin.userId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Something went wrong");
        return;
      }
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wide">
        Brand admins
      </p>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {admins.map((a) => (
        <div key={a.userId} className="flex items-center justify-between gap-3 text-sm">
          <div className="truncate">
            <span className="font-medium">{a.name}</span>{" "}
            <span className="text-gray-500 dark:text-gray-400 dark:text-gray-500">{a.email}</span>
            {a.status === "suspended" && (
              <span className="ml-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                Suspended
              </span>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              disabled={loadingId === a.userId}
              onClick={() => toggleSuspend(a)}
              className="border border-gray-200 dark:border-gray-700 text-xs px-2.5 py-1 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/60 dark:bg-gray-900 disabled:opacity-50"
            >
              {a.status === "active" ? "Suspend" : "Reactivate"}
            </button>
            <button
              disabled={loadingId === a.userId}
              onClick={() => remove(a)}
              className="border border-red-200 text-red-600 text-xs px-2.5 py-1 rounded-md hover:bg-red-50 disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
