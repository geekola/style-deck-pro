"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BrandAdminRow } from "./brand-admins-table";
import { ActionsMenu, type RowAction } from "@/components/admin/actions-menu";

const inputClass =
  "w-full text-xs border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white";
const labelClass = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1";

export function RowActions({
  row,
  expanded,
  onToggleDetails,
}: {
  row: BrandAdminRow;
  expanded: boolean;
  onToggleDetails: () => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState(false);
  const [form, setForm] = useState({ name: row.name, email: row.email });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleSuspend() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/brands/${row.brandId}/admins/${row.userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: row.status === "active" ? "suspended" : "active" }),
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
      setLoading(false);
    }
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${row.userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Something went wrong");
        return;
      }
      setEditing(false);
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function submitRemove() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/brands/${row.brandId}/admins/${row.userId}`, {
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
      setLoading(false);
    }
  }

  if (editing) {
    return (
      <ActionsMenu
        actions={[]}
        panel={
          <form onSubmit={submitEdit} className="space-y-2">
            <div>
              <label className={labelClass}>Name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputClass}
              />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setEditing(false);
                  setForm({ name: row.name, email: row.email });
                  setError(null);
                }}
                className="border border-gray-200 dark:border-gray-700 text-xs px-3 py-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/60 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-black dark:bg-white dark:text-black text-white text-xs px-3 py-1.5 rounded-md hover:bg-gray-800 disabled:opacity-50"
              >
                {loading ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        }
      />
    );
  }

  if (removeConfirm) {
    return (
      <ActionsMenu
        actions={[]}
        panel={
          <div className="space-y-2">
            <p className="text-xs text-red-600">
              Remove <span className="font-medium">{row.email}</span> as admin for{" "}
              <span className="font-medium">{row.brandName}</span>? They&apos;ll lose access to this
              brand&apos;s portal.
            </p>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-2 justify-end">
              <button
                disabled={loading}
                onClick={() => {
                  setRemoveConfirm(false);
                  setError(null);
                }}
                className="border border-gray-200 dark:border-gray-700 text-xs px-3 py-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/60 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                disabled={loading}
                onClick={submitRemove}
                className="bg-red-600 text-white text-xs px-3 py-1.5 rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? "Removing…" : "Remove"}
              </button>
            </div>
          </div>
        }
      />
    );
  }

  const actions: RowAction[] = [
    { key: "details", label: expanded ? "Hide details" : "View details", onClick: onToggleDetails },
    { key: "edit", label: "Edit admin", onClick: () => setEditing(true) },
    { key: "brand", label: "View brand", href: `/admin/brands#brand-${row.brandId}` },
    {
      key: "suspend",
      label: row.status === "active" ? "Suspend" : "Reactivate",
      onClick: toggleSuspend,
      disabled: loading,
    },
    { key: "remove", label: "Remove", onClick: () => setRemoveConfirm(true), variant: "danger" },
  ];

  return (
    <div className="relative inline-block text-left">
      <ActionsMenu actions={actions} />
      {error && (
        <p className="absolute right-0 mt-1 w-44 text-xs text-red-600 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-md p-2 shadow-lg z-10">
          {error}
        </p>
      )}
    </div>
  );
}
