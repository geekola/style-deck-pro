"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type BrandAdmin = {
  userId: string;
  name: string;
  email: string;
  status: "active" | "suspended";
};

type Brand = {
  id: string;
  name: string;
  category: string;
  adminEmail: string;
  fulfillmentEmail: string;
  accessPolicy: string;
  status: "pending" | "approved" | "suspended" | "rejected";
  statusReason: string | null;
  createdAt: string;
  admins: BrandAdmin[];
};

type Client = {
  customerId: string;
  name: string;
  email: string;
  type: string;
  industry: string;
  grantedAt: string;
};

const CATEGORIES = ["casual", "business", "formal", "custom"] as const;
const ACCESS_POLICIES = ["open", "selective", "invite_only"] as const;

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const inputClass =
  "w-full text-sm border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white bg-white dark:bg-gray-900";
const labelClass = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400",
    approved: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400",
    suspended: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400",
    rejected: "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${map[status] ?? map.rejected}`}>
      {cap(status)}
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
      <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">{title}</h2>
      {children}
    </div>
  );
}

export default function AdminBrandProfilePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();

  const [brand, setBrand] = useState<Brand | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", category: "", adminEmail: "", fulfillmentEmail: "", accessPolicy: "" });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Status action state
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [showReasonForm, setShowReasonForm] = useState<"rejected" | "suspended" | null>(null);
  const [reason, setReason] = useState("");
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Admin management state
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [addAdminLoading, setAddAdminLoading] = useState(false);
  const [addAdminError, setAddAdminError] = useState<string | null>(null);
  const [adminActionLoading, setAdminActionLoading] = useState<string | null>(null);
  const [adminActionError, setAdminActionError] = useState<string | null>(null);

  // Client block state
  const [blockingId, setBlockingId] = useState<string | null>(null);
  const [blockError, setBlockError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`/api/admin/brands/${id}`),
      fetch(`/api/admin/brands/${id}/clients`),
    ])
      .then(async ([brandRes, clientsRes]) => {
        if (brandRes.status === 404) {
          if (!cancelled) setError("Brand not found.");
          return;
        }
        if (!brandRes.ok) throw new Error("Failed to load");
        const [brandData, clientsData] = await Promise.all([
          brandRes.json(),
          clientsRes.ok ? clientsRes.json() : [],
        ]);
        if (cancelled) return;
        setBrand(brandData);
        setEditForm({
          name: brandData.name,
          category: brandData.category,
          adminEmail: brandData.adminEmail,
          fulfillmentEmail: brandData.fulfillmentEmail,
          accessPolicy: brandData.accessPolicy,
        });
        setClients(clientsData);
      })
      .catch(() => { if (!cancelled) setError("Failed to load brand."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    setEditLoading(true);
    setEditError(null);
    const res = await fetch(`/api/admin/brands/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setEditError(data?.error ?? "Something went wrong");
    } else {
      const data = await res.json();
      setBrand((prev) => prev ? { ...prev, ...data } : prev);
      setEditing(false);
    }
    setEditLoading(false);
  }

  async function submitStatus(newStatus: "approved" | "rejected" | "suspended", reasonText?: string) {
    setStatusLoading(true);
    setStatusError(null);
    const res = await fetch(`/api/admin/brands/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus, reason: reasonText }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setStatusError(data?.error ?? "Something went wrong");
    } else {
      const data = await res.json();
      if (data.tempPassword) {
        setTempPassword(data.tempPassword);
      }
      setBrand((prev) => prev ? { ...prev, status: newStatus, statusReason: data.statusReason } : prev);
      setShowReasonForm(null);
      setReason("");
    }
    setStatusLoading(false);
  }

  async function submitDelete() {
    setDeleteLoading(true);
    setDeleteError(null);
    const res = await fetch(`/api/admin/brands/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setDeleteError(data?.error ?? "Something went wrong");
      setDeleteLoading(false);
    } else {
      router.push("/admin/brands");
    }
  }

  async function addAdmin(e: React.FormEvent) {
    e.preventDefault();
    setAddAdminLoading(true);
    setAddAdminError(null);
    const res = await fetch(`/api/admin/brands/${id}/admins`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newAdminEmail }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setAddAdminError(data?.error ?? "Something went wrong");
    } else {
      setNewAdminEmail("");
      // Refresh admins
      const brandRes = await fetch(`/api/admin/brands/${id}`);
      if (brandRes.ok) {
        const data = await brandRes.json();
        setBrand(data);
      }
    }
    setAddAdminLoading(false);
  }

  async function toggleAdminSuspend(admin: BrandAdmin) {
    setAdminActionLoading(admin.userId);
    setAdminActionError(null);
    const newStatus = admin.status === "active" ? "suspended" : "active";
    const res = await fetch(`/api/admin/brands/${id}/admins/${admin.userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setAdminActionError(data?.error ?? "Something went wrong");
    } else {
      setBrand((prev) =>
        prev
          ? { ...prev, admins: prev.admins.map((a) => a.userId === admin.userId ? { ...a, status: newStatus } : a) }
          : prev
      );
    }
    setAdminActionLoading(null);
  }

  async function removeAdmin(admin: BrandAdmin) {
    if (!confirm(`Remove ${admin.email} as a brand admin?`)) return;
    setAdminActionLoading(admin.userId);
    setAdminActionError(null);
    const res = await fetch(`/api/admin/brands/${id}/admins/${admin.userId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setAdminActionError(data?.error ?? "Something went wrong");
    } else {
      setBrand((prev) =>
        prev ? { ...prev, admins: prev.admins.filter((a) => a.userId !== admin.userId) } : prev
      );
    }
    setAdminActionLoading(null);
  }

  async function blockClient(customerId: string) {
    setBlockingId(customerId);
    setBlockError(null);
    const res = await fetch(`/api/admin/brands/${id}/clients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId, grant: false }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setBlockError(data?.error ?? "Something went wrong");
    } else {
      setClients((prev) => prev.filter((c) => c.customerId !== customerId));
    }
    setBlockingId(null);
  }

  if (loading) {
    return <div className="max-w-3xl mx-auto px-6 py-10 text-sm text-gray-500 dark:text-gray-400">Loading…</div>;
  }
  if (error || !brand) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10">
        <p className="text-sm text-red-600 mb-4">{error ?? "Brand not found."}</p>
        <Link href="/admin/brands" className="text-sm underline">Back to brands</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/admin/brands"
          className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1 mb-3"
        >
          <span>&#8592;</span> Brands
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{brand.name}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 capitalize">{brand.category}</p>
          </div>
          <StatusBadge status={brand.status} />
        </div>
      </div>

      {/* Temp password banner */}
      {tempPassword && (
        <div className="border border-amber-300 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 text-sm">
          <p className="font-medium text-amber-900 dark:text-amber-300 mb-2">Brand approved — temporary password:</p>
          <code className="block font-mono text-base bg-white dark:bg-gray-900 border border-amber-200 rounded px-3 py-2 select-all mb-2">
            {tempPassword}
          </code>
          <p className="text-amber-700 dark:text-amber-400 text-xs mb-3">Share this securely — it won't be shown again.</p>
          <button
            onClick={() => setTempPassword(null)}
            className="text-xs bg-amber-700 text-white px-3 py-1.5 rounded-md hover:bg-amber-800"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Brand details */}
      <Section title="Brand details">
        {editing ? (
          <form onSubmit={submitEdit} className="space-y-3">
            <div>
              <label className={labelClass}>Brand name</label>
              <input type="text" required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Category</label>
                <select value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} className={inputClass}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{cap(c)}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Access policy</label>
                <select value={editForm.accessPolicy} onChange={(e) => setEditForm({ ...editForm, accessPolicy: e.target.value })} className={inputClass}>
                  {ACCESS_POLICIES.map((p) => <option key={p} value={p}>{cap(p)}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className={labelClass}>Admin email</label>
              <input type="email" required value={editForm.adminEmail} onChange={(e) => setEditForm({ ...editForm, adminEmail: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Fulfillment email</label>
              <input type="email" required value={editForm.fulfillmentEmail} onChange={(e) => setEditForm({ ...editForm, fulfillmentEmail: e.target.value })} className={inputClass} />
            </div>
            {editError && <p className="text-xs text-red-600">{editError}</p>}
            <div className="flex gap-2 justify-end">
              <button type="button" disabled={editLoading} onClick={() => { setEditing(false); setEditError(null); }}
                className="border border-gray-200 dark:border-gray-700 text-sm px-4 py-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/60 disabled:opacity-50">
                Cancel
              </button>
              <button type="submit" disabled={editLoading}
                className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm px-4 py-1.5 rounded-md hover:bg-gray-700 dark:hover:bg-gray-100 disabled:opacity-50">
                {editLoading ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        ) : (
          <div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm mb-4">
              <Field label="Admin email" value={brand.adminEmail} />
              <Field label="Fulfillment email" value={brand.fulfillmentEmail} />
              <Field label="Access policy" value={cap(brand.accessPolicy)} />
              <Field label="Member since" value={fmtDate(brand.createdAt)} />
              {brand.statusReason && <Field label="Status reason" value={brand.statusReason} />}
              <div className="col-span-2">
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Brand ID</p>
                <p className="font-mono text-xs text-gray-600 dark:text-gray-400 break-all">{brand.id}</p>
              </div>
            </div>
            <button onClick={() => setEditing(true)}
              className="text-sm border border-gray-200 dark:border-gray-700 px-4 py-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/60">
              Edit
            </button>
          </div>
        )}
      </Section>

      {/* Status actions */}
      <Section title="Status">
        <div className="flex items-center justify-between mb-4">
          <div>
            <StatusBadge status={brand.status} />
            {brand.statusReason && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{brand.statusReason}</p>
            )}
          </div>
        </div>

        {showReasonForm ? (
          <div className="space-y-2">
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={showReasonForm === "rejected" ? "Reason for rejection (optional)" : "Reason for suspension (optional)"}
              rows={2}
              className={inputClass}
            />
            {statusError && <p className="text-xs text-red-600">{statusError}</p>}
            <div className="flex gap-2">
              <button onClick={() => { setShowReasonForm(null); setReason(""); setStatusError(null); }}
                className="border border-gray-200 dark:border-gray-700 text-sm px-4 py-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/60">
                Cancel
              </button>
              <button disabled={statusLoading} onClick={() => submitStatus(showReasonForm, reason.trim() || undefined)}
                className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm px-4 py-1.5 rounded-md hover:bg-gray-700 disabled:opacity-50">
                {statusLoading ? "Saving…" : "Confirm"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {statusError && <p className="w-full text-xs text-red-600">{statusError}</p>}
            {brand.status === "pending" && (
              <>
                <button disabled={statusLoading} onClick={() => submitStatus("approved")}
                  className="bg-green-600 text-white text-sm px-4 py-1.5 rounded-md hover:bg-green-700 disabled:opacity-50">
                  {statusLoading ? "Saving…" : "Approve"}
                </button>
                <button onClick={() => setShowReasonForm("rejected")}
                  className="border border-gray-200 dark:border-gray-700 text-sm px-4 py-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/60">
                  Reject
                </button>
              </>
            )}
            {brand.status === "approved" && (
              <button onClick={() => setShowReasonForm("suspended")}
                className="border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 text-sm px-4 py-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20">
                Suspend
              </button>
            )}
            {(brand.status === "suspended" || brand.status === "rejected") && (
              <button disabled={statusLoading} onClick={() => submitStatus("approved")}
                className="bg-green-600 text-white text-sm px-4 py-1.5 rounded-md hover:bg-green-700 disabled:opacity-50">
                {statusLoading ? "Saving…" : "Reactivate"}
              </button>
            )}
          </div>
        )}

        {/* Delete */}
        <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
          {showDeleteConfirm ? (
            <div className="space-y-2">
              <p className="text-sm text-red-600">
                Permanently delete <strong>{brand.name}</strong>? This removes all products, access rules, and gifting data and can't be undone.
              </p>
              {deleteError && <p className="text-xs text-red-600">{deleteError}</p>}
              <div className="flex gap-2">
                <button onClick={() => { setShowDeleteConfirm(false); setDeleteError(null); }}
                  className="border border-gray-200 dark:border-gray-700 text-sm px-4 py-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/60">
                  Cancel
                </button>
                <button disabled={deleteLoading} onClick={submitDelete}
                  className="bg-red-600 text-white text-sm px-4 py-1.5 rounded-md hover:bg-red-700 disabled:opacity-50">
                  {deleteLoading ? "Deleting…" : "Delete permanently"}
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowDeleteConfirm(true)}
              className="text-sm text-red-600 dark:text-red-400 hover:underline">
              Delete brand
            </button>
          )}
        </div>
      </Section>

      {/* Brand admins */}
      {(brand.status === "approved" || brand.status === "suspended") && (
        <Section title="Brand admins">
          {adminActionError && <p className="text-xs text-red-600 mb-3">{adminActionError}</p>}

          {brand.admins.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">No admins yet.</p>
          ) : (
            <div className="space-y-2 mb-4">
              {brand.admins.map((a) => (
                <div key={a.userId} className="flex items-center justify-between gap-3 text-sm py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <div className="truncate">
                    <span className="font-medium">{a.name}</span>{" "}
                    <span className="text-gray-400 dark:text-gray-500">{a.email}</span>
                    {a.status === "suspended" && (
                      <span className="ml-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">Suspended</span>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button disabled={adminActionLoading === a.userId} onClick={() => toggleAdminSuspend(a)}
                      className="border border-gray-200 dark:border-gray-700 text-xs px-2.5 py-1 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/60 disabled:opacity-50">
                      {a.status === "active" ? "Suspend" : "Reactivate"}
                    </button>
                    <button disabled={adminActionLoading === a.userId} onClick={() => removeAdmin(a)}
                      className="border border-red-200 text-red-600 text-xs px-2.5 py-1 rounded-md hover:bg-red-50 disabled:opacity-50">
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {brand.status === "approved" && (
            <form onSubmit={addAdmin} className="flex gap-2">
              <input
                type="email"
                required
                placeholder="Add admin by email…"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                className={inputClass}
              />
              <button type="submit" disabled={addAdminLoading}
                className="shrink-0 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm px-4 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50">
                {addAdminLoading ? "Adding…" : "Add"}
              </button>
            </form>
          )}
          {addAdminError && <p className="text-xs text-red-600 mt-2">{addAdminError}</p>}
        </Section>
      )}

      {/* Active clients */}
      {brand.status === "approved" && (
        <Section title={`Active clients (${clients.length})`}>
          {blockError && <p className="text-xs text-red-600 mb-3">{blockError}</p>}
          {clients.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">No clients have been granted access.</p>
          ) : (
            <div className="space-y-0">
              {clients.map((c) => (
                <div key={c.customerId} className="flex items-center justify-between gap-3 text-sm py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <div className="truncate">
                    <span className="font-medium">{c.name}</span>{" "}
                    <span className="text-gray-400 dark:text-gray-500">{c.email}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 ml-2 capitalize">{c.type} · {c.industry}</span>
                  </div>
                  <button
                    disabled={blockingId === c.customerId}
                    onClick={() => blockClient(c.customerId)}
                    className="shrink-0 border border-red-200 text-red-600 text-xs px-2.5 py-1 rounded-md hover:bg-red-50 disabled:opacity-50"
                  >
                    {blockingId === c.customerId ? "Revoking…" : "Revoke"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </Section>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm text-gray-800 dark:text-gray-200">{value}</p>
    </div>
  );
}
