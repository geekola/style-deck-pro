"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { BrandAdminRow } from "./brand-admins-table";

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
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState(false);
  const [form, setForm] = useState({ name: row.name, email: row.email });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

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
      setOpen(false);
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
      <form onSubmit={submitEdit} className="text-left w-64 ml-auto space-y-2">
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
    );
  }

  if (removeConfirm) {
    return (
      <div className="text-left w-64 ml-auto space-y-2">
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
    );
  }

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-gray-400 hover:text-black dark:hover:text-white px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
        aria-label="Row actions"
      >
        ⋯
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-1 w-44 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg py-1 text-sm">
          <button
            onClick={() => {
              onToggleDetails();
              setOpen(false);
            }}
            className="block w-full text-left px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800/60"
          >
            {expanded ? "Hide details" : "View details"}
          </button>
          <button
            onClick={() => {
              setEditing(true);
              setOpen(false);
            }}
            className="block w-full text-left px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800/60"
          >
            Edit admin
          </button>
          <Link
            href={`/admin/brands#brand-${row.brandId}`}
            onClick={() => setOpen(false)}
            className="block w-full text-left px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800/60"
          >
            View brand
          </Link>
          <button
            disabled={loading}
            onClick={toggleSuspend}
            className="block w-full text-left px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800/60 disabled:opacity-50"
          >
            {row.status === "active" ? "Suspend" : "Reactivate"}
          </button>
          <button
            onClick={() => {
              setRemoveConfirm(true);
              setOpen(false);
            }}
            className="block w-full text-left px-3 py-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
          >
            Remove
          </button>
        </div>
      )}
      {error && !open && (
        <p className="absolute right-0 mt-1 w-44 text-xs text-red-600 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-md p-2 shadow-lg z-10">
          {error}
        </p>
      )}
    </div>
  );
}
