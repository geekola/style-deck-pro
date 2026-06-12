"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Profile = {
  name: string;
  email: string;
  customerType: string;
  customerIndustry: string;
};

const CUSTOMER_TYPES = ["actor", "athlete", "influencer", "performer"] as const;
const INDUSTRIES = ["film", "music", "sports", "fashion", "business", "media", "technology", "other"] as const;

const inputClass =
  "w-full text-xs border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white";
const labelClass = "block text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-1";

export function UserActions({
  userId,
  currentStatus,
  profile,
}: {
  userId: string;
  currentStatus: "active" | "suspended";
  profile: Profile;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(profile);
  const [editError, setEditError] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    await fetch(`/api/admin/users/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerStatus: currentStatus === "active" ? "suspended" : "active",
      }),
    });
    router.refresh();
    setLoading(false);
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    setEditLoading(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          customerType: form.customerType,
          customerIndustry: form.customerIndustry,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setEditError(data?.error ?? "Something went wrong");
        return;
      }
      setEditing(false);
      router.refresh();
    } catch {
      setEditError("Something went wrong");
    } finally {
      setEditLoading(false);
    }
  }

  async function submitDelete() {
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setDeleteError(data?.error ?? "Something went wrong");
        setDeleteLoading(false);
        return;
      }
      router.refresh();
    } catch {
      setDeleteError("Something went wrong");
      setDeleteLoading(false);
    }
  }

  if (editing) {
    return (
      <form onSubmit={submitEdit} className="space-y-2 text-left w-64">
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
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelClass}>Customer type</label>
            <select
              value={form.customerType}
              onChange={(e) => setForm({ ...form, customerType: e.target.value })}
              className={inputClass}
            >
              {CUSTOMER_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Industry</label>
            <select
              value={form.customerIndustry}
              onChange={(e) => setForm({ ...form, customerIndustry: e.target.value })}
              className={inputClass}
            >
              {INDUSTRIES.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </div>
        </div>
        {editError && <p className="text-xs text-red-600">{editError}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={editLoading}
            className="bg-black dark:bg-white dark:text-black text-white text-xs px-3 py-1.5 rounded-md hover:bg-gray-800 disabled:opacity-50"
          >
            {editLoading ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            disabled={editLoading}
            onClick={() => {
              setEditing(false);
              setForm(profile);
              setEditError(null);
            }}
            className="border border-gray-200 dark:border-gray-700 text-xs px-3 py-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/60 dark:bg-gray-900 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  if (deleteConfirm) {
    return (
      <div className="space-y-2 text-left w-64">
        <p className="text-xs text-red-600">
          Permanently delete <span className="font-medium">{profile.name}</span>&apos;s account?
          This can&apos;t be undone.
        </p>
        {deleteError && <p className="text-xs text-red-600">{deleteError}</p>}
        <div className="flex gap-2">
          <button
            disabled={deleteLoading}
            onClick={submitDelete}
            className="bg-red-600 text-white text-xs px-3 py-1.5 rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            {deleteLoading ? "Deleting…" : "Delete permanently"}
          </button>
          <button
            disabled={deleteLoading}
            onClick={() => {
              setDeleteConfirm(false);
              setDeleteError(null);
            }}
            className="border border-gray-200 dark:border-gray-700 text-xs px-3 py-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/60 dark:bg-gray-900 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-end gap-2">
      <button
        onClick={toggle}
        disabled={loading}
        className={`text-xs px-3 py-1 rounded border disabled:opacity-50 ${
          currentStatus === "active"
            ? "border-red-200 text-red-600 hover:bg-red-50"
            : "border-green-200 text-green-700 dark:text-green-400 hover:bg-green-50"
        }`}
      >
        {loading ? "…" : currentStatus === "active" ? "Suspend" : "Activate"}
      </button>
      <button
        onClick={() => setEditing(true)}
        className="text-xs px-3 py-1 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60 dark:bg-gray-900"
      >
        Edit
      </button>
      <button
        onClick={() => setDeleteConfirm(true)}
        className="text-xs px-3 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50"
      >
        Delete
      </button>
    </div>
  );
}
