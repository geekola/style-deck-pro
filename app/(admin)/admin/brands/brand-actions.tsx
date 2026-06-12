"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type BrandStatus = "pending" | "approved" | "rejected" | "suspended";

type BrandDetails = {
  name: string;
  category: string;
  adminEmail: string;
  fulfillmentEmail: string;
  accessPolicy: string;
};

const CATEGORIES = ["casual", "business", "formal", "custom"] as const;
const ACCESS_POLICIES = ["open", "selective", "invite_only"] as const;

const inputClass =
  "w-full text-xs border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white";
const labelClass = "block text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-1";

export function BrandActions({
  id,
  status,
  brand,
}: {
  id: string;
  status: BrandStatus;
  brand: BrandDetails;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [reasonMode, setReasonMode] = useState<"rejected" | "suspended" | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<BrandDetails>(brand);
  const [editError, setEditError] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function submit(newStatus: "approved" | "rejected" | "suspended", reasonText?: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/brands/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, reason: reasonText }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Something went wrong");
        setLoading(false);
        return;
      }

      const data = await res.json();
      setReasonMode(null);
      setReason("");

      if (data.tempPassword) {
        // Hold off refreshing until the admin has copied the temp password --
        // refreshing now would re-render this component and lose the value.
        setTempPassword(data.tempPassword);
        setLoading(false);
        return;
      }

      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handleDone() {
    setTempPassword(null);
    router.refresh();
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    setEditLoading(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/admin/brands/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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
      const res = await fetch(`/api/admin/brands/${id}`, { method: "DELETE" });

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

  if (tempPassword) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs space-y-2">
        <p className="font-medium text-amber-900">Brand approved -- temporary password:</p>
        <code className="block bg-white dark:bg-gray-950 border border-amber-200 rounded px-2 py-1 font-mono text-sm select-all">
          {tempPassword}
        </code>
        <p className="text-amber-700">
          Share this securely -- it won&apos;t be shown again.
        </p>
        <button
          onClick={handleDone}
          className="bg-black dark:bg-white dark:text-black text-white text-xs px-3 py-1.5 rounded-md hover:bg-gray-800"
        >
          Done
        </button>
      </div>
    );
  }

  if (reasonMode) {
    return (
      <div className="space-y-2">
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={
            reasonMode === "rejected"
              ? "Reason for rejection (optional)"
              : "Reason for suspension (optional)"
          }
          rows={2}
          className="w-full text-xs border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            disabled={loading}
            onClick={() => submit(reasonMode, reason.trim() || undefined)}
            className="bg-black dark:bg-white dark:text-black text-white text-xs px-3 py-1.5 rounded-md hover:bg-gray-800 disabled:opacity-50"
          >
            Confirm
          </button>
          <button
            disabled={loading}
            onClick={() => {
              setReasonMode(null);
              setReason("");
              setError(null);
            }}
            className="border border-gray-200 dark:border-gray-700 text-xs px-3 py-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/60 dark:bg-gray-900 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (editing) {
    return (
      <form onSubmit={submitEdit} className="space-y-2 w-full max-w-sm">
        <div>
          <label className={labelClass}>Brand name</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputClass}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelClass}>Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className={inputClass}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Access policy</label>
            <select
              value={form.accessPolicy}
              onChange={(e) => setForm({ ...form, accessPolicy: e.target.value })}
              className={inputClass}
            >
              {ACCESS_POLICIES.map((p) => (
                <option key={p} value={p}>
                  {p.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className={labelClass}>Admin email</label>
          <input
            type="email"
            required
            value={form.adminEmail}
            onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Fulfillment email</label>
          <input
            type="email"
            required
            value={form.fulfillmentEmail}
            onChange={(e) => setForm({ ...form, fulfillmentEmail: e.target.value })}
            className={inputClass}
          />
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
              setForm(brand);
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
      <div className="space-y-2 max-w-sm">
        <p className="text-xs text-red-600">
          Permanently delete <span className="font-medium">{brand.name}</span>? This removes its
          products, access rules, and gifting data and can&apos;t be undone.
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
    <div className="space-y-2">
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        {status === "pending" && (
          <>
            <button
              disabled={loading}
              onClick={() => submit("approved")}
              className="bg-black dark:bg-white dark:text-black text-white text-xs px-3 py-1.5 rounded-md hover:bg-gray-800 disabled:opacity-50"
            >
              Approve
            </button>
            <button
              disabled={loading}
              onClick={() => setReasonMode("rejected")}
              className="border border-gray-200 dark:border-gray-700 text-xs px-3 py-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/60 dark:bg-gray-900 disabled:opacity-50"
            >
              Reject
            </button>
          </>
        )}

        {status === "approved" && (
          <button
            disabled={loading}
            onClick={() => setReasonMode("suspended")}
            className="border border-red-200 text-red-600 text-xs px-3 py-1.5 rounded-md hover:bg-red-50 disabled:opacity-50"
          >
            Suspend
          </button>
        )}

        {status === "suspended" && (
          <button
            disabled={loading}
            onClick={() => submit("approved")}
            className="bg-black dark:bg-white dark:text-black text-white text-xs px-3 py-1.5 rounded-md hover:bg-gray-800 disabled:opacity-50"
          >
            Reactivate
          </button>
        )}

        {status === "rejected" && (
          <button
            disabled={loading}
            onClick={() => submit("approved")}
            className="bg-black dark:bg-white dark:text-black text-white text-xs px-3 py-1.5 rounded-md hover:bg-gray-800 disabled:opacity-50"
          >
            Approve
          </button>
        )}

        <button
          disabled={loading}
          onClick={() => setEditing(true)}
          className="border border-gray-200 dark:border-gray-700 text-xs px-3 py-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/60 dark:bg-gray-900 disabled:opacity-50"
        >
          Edit
        </button>

        <button
          disabled={loading}
          onClick={() => setDeleteConfirm(true)}
          className="border border-red-200 text-red-600 text-xs px-3 py-1.5 rounded-md hover:bg-red-50 disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
