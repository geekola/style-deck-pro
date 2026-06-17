"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  updatedAt: string;
  admins: BrandAdmin[];
};

type Client = {
  customerId: string;
  name: string;
  email: string;
  type: string;
  industry: string;
  status: "active" | "suspended";
  grantedAt: string;
};

type Stats = {
  totalProducts: number;
  activeClients: number;
  giftedItems: number;
  pendingGifts: number;
  acceptanceRate: number | null;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = ["casual", "business", "formal", "custom"] as const;
const ACCESS_POLICIES = ["open", "selective", "invite_only"] as const;

const STATUS_CONFIG: Record<Brand["status"], { label: string; dot: string; badge: string }> = {
  pending: { label: "Pending Review", dot: "bg-amber-400", badge: "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400" },
  approved: { label: "Approved", dot: "bg-green-500", badge: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400" },
  suspended: { label: "Suspended", dot: "bg-red-500", badge: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400" },
  rejected: { label: "Rejected", dot: "bg-gray-400", badge: "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Shared components ────────────────────────────────────────────────────────

const inputClass =
  "w-full text-sm border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white bg-white dark:bg-gray-900 text-gray-900 dark:text-white";

const labelClass = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1";

const sectionHeadingClass =
  "text-xs font-semibold uppercase tracking-widest text-gray-400 border-b border-gray-200 dark:border-gray-700 pb-2 mb-5";

function StatusBadge({ status }: { status: Brand["status"] }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{label}</p>
      <p className={`text-sm text-gray-800 dark:text-gray-200 ${mono ? "font-mono break-all text-xs" : ""}`}>{value}</p>
    </div>
  );
}

// ─── Overflow menu ────────────────────────────────────────────────────────────

type MenuAction = { label: string; onClick: () => void; destructive?: boolean; disabled?: boolean };

function OverflowMenu({ actions }: { actions: MenuAction[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        aria-label="Actions"
      >
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
          <circle cx="8" cy="3" r="1.5" /><circle cx="8" cy="8" r="1.5" /><circle cx="8" cy="13" r="1.5" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-30 min-w-[160px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-1 overflow-hidden">
          {actions.map((a) => (
            <button
              key={a.label}
              type="button"
              disabled={a.disabled}
              onClick={() => { setOpen(false); a.onClick(); }}
              className={`w-full text-left px-4 py-2 text-sm transition-colors disabled:opacity-40 ${
                a.destructive
                  ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminBrandProfilePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();

  const [brand, setBrand] = useState<Brand | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit brand
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", category: "", adminEmail: "", fulfillmentEmail: "", accessPolicy: "" });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Status management
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [showReasonFor, setShowReasonFor] = useState<"rejected" | "suspended" | null>(null);
  const [reason, setReason] = useState("");
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  // Admin management
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Brand Admin");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [adminActionLoading, setAdminActionLoading] = useState<string | null>(null);
  const [adminActionError, setAdminActionError] = useState<string | null>(null);

  // Client management
  const [clientSearch, setClientSearch] = useState("");
  const [clientTypeFilter, setClientTypeFilter] = useState("all");
  const [clientIndustryFilter, setClientIndustryFilter] = useState("all");
  const [clientStatusFilter, setClientStatusFilter] = useState("all");
  const [blockingId, setBlockingId] = useState<string | null>(null);
  const [blockError, setBlockError] = useState<string | null>(null);

  // Danger zone
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // ── Load ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`/api/admin/brands/${id}`),
      fetch(`/api/admin/brands/${id}/clients`),
      fetch(`/api/admin/brands/${id}/stats`),
    ])
      .then(async ([brandRes, clientsRes, statsRes]) => {
        if (brandRes.status === 404) { if (!cancelled) setError("Brand not found."); return; }
        if (!brandRes.ok) throw new Error("Failed to load");
        const [brandData, clientsData, statsData] = await Promise.all([
          brandRes.json(),
          clientsRes.ok ? clientsRes.json() : [],
          statsRes.ok ? statsRes.json() : null,
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
        setStats(statsData);
      })
      .catch(() => { if (!cancelled) setError("Failed to load brand."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  // ── Handlers ────────────────────────────────────────────────────────────────

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
      if (data.tempPassword) setTempPassword(data.tempPassword);
      setBrand((prev) => prev ? { ...prev, status: newStatus, statusReason: data.statusReason } : prev);
      setShowReasonFor(null);
      setReason("");
    }
    setStatusLoading(false);
  }

  async function handleInviteAdmin(e: React.FormEvent) {
    e.preventDefault();
    setInviteLoading(true);
    setInviteError(null);
    const res = await fetch(`/api/admin/brands/${id}/admins`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setInviteError(data?.error ?? "Something went wrong");
    } else {
      setInviteEmail("");
      const brandRes = await fetch(`/api/admin/brands/${id}`);
      if (brandRes.ok) setBrand(await brandRes.json());
    }
    setInviteLoading(false);
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
        prev ? { ...prev, admins: prev.admins.map((a) => a.userId === admin.userId ? { ...a, status: newStatus } : a) } : prev
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
      setBrand((prev) => prev ? { ...prev, admins: prev.admins.filter((a) => a.userId !== admin.userId) } : prev);
    }
    setAdminActionLoading(null);
  }

  async function revokeClient(customerId: string) {
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

  // ── Client filtering ────────────────────────────────────────────────────────

  const clientTypes = [...new Set(clients.map((c) => c.type).filter(Boolean))];
  const clientIndustries = [...new Set(clients.map((c) => c.industry).filter(Boolean))];

  const filteredClients = clients.filter((c) => {
    const q = clientSearch.toLowerCase();
    if (q && !c.name.toLowerCase().includes(q) && !c.email.toLowerCase().includes(q)) return false;
    if (clientTypeFilter !== "all" && c.type !== clientTypeFilter) return false;
    if (clientIndustryFilter !== "all" && c.industry !== clientIndustryFilter) return false;
    if (clientStatusFilter !== "all" && c.status !== clientStatusFilter) return false;
    return true;
  });

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) return <div className="max-w-4xl mx-auto px-6 py-10 text-sm text-gray-500 dark:text-gray-400">Loading…</div>;
  if (error || !brand) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-10">
        <p className="text-sm text-red-600 mb-4">{error ?? "Brand not found."}</p>
        <Link href="/admin/brands" className="text-sm underline">Back to brands</Link>
      </div>
    );
  }

  const approvedOrSuspended = brand.status === "approved" || brand.status === "suspended";

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div>
        <Link href="/admin/brands" className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1 mb-4">
          ← Brands
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{brand.name}</h1>
              <StatusBadge status={brand.status} />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{brand.category} · Fashion Brand</p>
            <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500 flex-wrap pt-1">
              <span>Member since {fmtDate(brand.createdAt)}</span>
              <span>·</span>
              <span>{brand.admins.length} brand admin{brand.admins.length !== 1 ? "s" : ""}</span>
              <span>·</span>
              <span>{clients.length} active client{clients.length !== 1 ? "s" : ""}</span>
            </div>
          </div>
          <button
            onClick={() => setEditing((e) => !e)}
            className="shrink-0 text-sm border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors text-gray-700 dark:text-gray-300"
          >
            {editing ? "Cancel edit" : "Edit Brand"}
          </button>
        </div>
      </div>

      {/* ── Temp password banner ────────────────────────────────────────────── */}
      {tempPassword && (
        <div className="border border-amber-300 bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 text-sm">
          <p className="font-medium text-amber-900 dark:text-amber-300 mb-2">Brand approved — temporary password:</p>
          <code className="block font-mono text-base bg-white dark:bg-gray-900 border border-amber-200 rounded-lg px-3 py-2 select-all mb-2">
            {tempPassword}
          </code>
          <p className="text-amber-700 dark:text-amber-400 text-xs mb-3">Share this securely — it won't be shown again.</p>
          <button onClick={() => setTempPassword(null)} className="text-xs bg-amber-700 text-white px-3 py-1.5 rounded-lg hover:bg-amber-800">
            Dismiss
          </button>
        </div>
      )}

      {/* ── Overview ───────────────────────────────────────────────────────── */}
      <section>
        <h2 className={sectionHeadingClass}>Overview</h2>

        {editing ? (
          <form onSubmit={submitEdit} className="space-y-4 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Admin email</label>
                <input type="email" required value={editForm.adminEmail} onChange={(e) => setEditForm({ ...editForm, adminEmail: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Fulfillment email</label>
                <input type="email" required value={editForm.fulfillmentEmail} onChange={(e) => setEditForm({ ...editForm, fulfillmentEmail: e.target.value })} className={inputClass} />
              </div>
            </div>
            {editError && <p className="text-xs text-red-600">{editError}</p>}
            <div className="flex gap-2 justify-end">
              <button type="button" disabled={editLoading} onClick={() => { setEditing(false); setEditError(null); }}
                className="text-sm border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/60 disabled:opacity-50">
                Cancel
              </button>
              <button type="submit" disabled={editLoading}
                className="text-sm bg-black dark:bg-white dark:text-black text-white px-4 py-2 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50">
                {editLoading ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-2 gap-6">
            {/* Brand information */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Brand Information</p>
              <Field label="Brand name" value={brand.name} />
              <Field label="Category" value={cap(brand.category)} />
              <Field label="Admin email" value={brand.adminEmail} />
              <Field label="Fulfillment email" value={brand.fulfillmentEmail} />
              <Field label="Access policy" value={cap(brand.accessPolicy)} />
            </div>
            {/* Account information */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Account Information</p>
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Status</p>
                <StatusBadge status={brand.status} />
                {brand.statusReason && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{brand.statusReason}</p>}
              </div>
              <Field label="Member since" value={fmtDate(brand.createdAt)} />
              <Field label="Last activity" value={brand.updatedAt ? fmtDate(brand.updatedAt) : "—"} />
              <Field label="Brand ID" value={brand.id} mono />
            </div>
          </div>
        )}
      </section>

      {/* ── Brand Performance ───────────────────────────────────────────────── */}
      <section>
        <h2 className={sectionHeadingClass}>Brand Performance</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Total Products", value: stats?.totalProducts ?? "—" },
            { label: "Active Clients", value: stats?.activeClients ?? "—" },
            { label: "Gifted Items", value: stats?.giftedItems ?? "—" },
            { label: "Pending Gifts", value: stats?.pendingGifts ?? "—" },
            {
              label: "Acceptance Rate",
              value: stats?.acceptanceRate != null ? `${stats.acceptanceRate}%` : "—",
            },
          ].map(({ label, value }) => (
            <div key={label} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center">
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{value}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 leading-tight">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Brand Admins ────────────────────────────────────────────────────── */}
      {approvedOrSuspended && (
        <section>
          <h2 className={sectionHeadingClass}>Brand Admins</h2>

          {adminActionError && <p className="text-xs text-red-600 mb-3">{adminActionError}</p>}

          {brand.admins.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">No admins yet.</p>
          ) : (
            <div className="grid gap-3 mb-5">
              {brand.admins.map((a) => (
                <div key={a.userId} className="border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{a.name}</p>
                      {a.status === "suspended" && (
                        <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full">Suspended</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{a.email}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Brand Admin</p>
                  </div>
                  <OverflowMenu
                    actions={[
                      { label: "View Profile", onClick: () => router.push(`/admin/users/${a.userId}`), disabled: true },
                      {
                        label: a.status === "active" ? "Suspend Admin" : "Reactivate Admin",
                        onClick: () => toggleAdminSuspend(a),
                        disabled: adminActionLoading === a.userId,
                      },
                      {
                        label: "Remove Admin",
                        onClick: () => removeAdmin(a),
                        destructive: true,
                        disabled: adminActionLoading === a.userId,
                      },
                    ]}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Invite admin form */}
          {brand.status === "approved" && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-5">
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-3">Invite Brand Admin</p>
              <form onSubmit={handleInviteAdmin} className="space-y-3">
                <div>
                  <label className={labelClass}>Email address</label>
                  <input
                    type="email"
                    required
                    placeholder="admin@brand.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Role</label>
                  <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className={inputClass}>
                    <option>Brand Admin</option>
                  </select>
                </div>
                {inviteError && <p className="text-xs text-red-600">{inviteError}</p>}
                <div className="flex justify-end">
                  <button type="submit" disabled={inviteLoading}
                    className="text-sm bg-black dark:bg-white dark:text-black text-white px-5 py-2 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50">
                    {inviteLoading ? "Sending…" : "Send Invitation"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </section>
      )}

      {/* ── Client Management ───────────────────────────────────────────────── */}
      {brand.status === "approved" && (
        <section>
          <h2 className={sectionHeadingClass}>Clients ({clients.length})</h2>

          {/* Search + filters */}
          <div className="flex flex-wrap gap-2 mb-4">
            <input
              type="search"
              placeholder="Search by name or email…"
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              className="flex-1 min-w-[200px] text-sm border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            />
            {clientTypes.length > 0 && (
              <select value={clientTypeFilter} onChange={(e) => setClientTypeFilter(e.target.value)}
                className="text-sm border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white">
                <option value="all">All types</option>
                {clientTypes.map((t) => <option key={t} value={t}>{cap(t)}</option>)}
              </select>
            )}
            {clientIndustries.length > 0 && (
              <select value={clientIndustryFilter} onChange={(e) => setClientIndustryFilter(e.target.value)}
                className="text-sm border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white">
                <option value="all">All industries</option>
                {clientIndustries.map((i) => <option key={i} value={i}>{cap(i)}</option>)}
              </select>
            )}
            <select value={clientStatusFilter} onChange={(e) => setClientStatusFilter(e.target.value)}
              className="text-sm border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white">
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          {blockError && <p className="text-xs text-red-600 mb-3">{blockError}</p>}

          {filteredClients.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 py-4">
              {clients.length === 0 ? "No clients have been granted access." : "No clients match your filters."}
            </p>
          ) : (
            <div className="grid gap-3">
              {filteredClients.map((c) => (
                <div key={c.customerId} className="border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{c.name}</p>
                      {c.status === "suspended" && (
                        <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full">Suspended</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{c.email}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs text-gray-400 dark:text-gray-500 capitalize">{c.type}</span>
                      <span className="text-gray-300 dark:text-gray-600">·</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 capitalize">{c.industry}</span>
                      <span className="text-gray-300 dark:text-gray-600">·</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">Joined {fmtDate(c.grantedAt)}</span>
                    </div>
                  </div>
                  <OverflowMenu
                    actions={[
                      { label: "View Profile", onClick: () => router.push(`/admin/customers/${c.customerId}`), disabled: true },
                      {
                        label: "Revoke Access",
                        onClick: () => revokeClient(c.customerId),
                        destructive: true,
                        disabled: blockingId === c.customerId,
                      },
                    ]}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Status Management ───────────────────────────────────────────────── */}
      <section>
        <h2 className={sectionHeadingClass}>Status Management</h2>

        <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Current status</p>
              <StatusBadge status={brand.status} />
              {brand.statusReason && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">{brand.statusReason}</p>
              )}
            </div>
          </div>

          {showReasonFor ? (
            <div className="space-y-3">
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={showReasonFor === "rejected" ? "Reason for rejection (optional)" : "Reason for suspension (optional)"}
                rows={2}
                className={inputClass}
              />
              {statusError && <p className="text-xs text-red-600">{statusError}</p>}
              <div className="flex gap-2">
                <button onClick={() => { setShowReasonFor(null); setReason(""); setStatusError(null); }}
                  className="text-sm border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/60">
                  Cancel
                </button>
                <button disabled={statusLoading} onClick={() => submitStatus(showReasonFor, reason.trim() || undefined)}
                  className="text-sm bg-black dark:bg-white dark:text-black text-white px-4 py-2 rounded-xl hover:bg-gray-800 disabled:opacity-50">
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
                    className="text-sm bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700 disabled:opacity-50">
                    {statusLoading ? "Saving…" : "Approve"}
                  </button>
                  <button onClick={() => setShowReasonFor("rejected")}
                    className="text-sm border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/60">
                    Reject
                  </button>
                </>
              )}
              {brand.status === "approved" && (
                <button onClick={() => setShowReasonFor("suspended")}
                  className="text-sm border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 px-4 py-2 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-900/20">
                  Suspend brand
                </button>
              )}
              {(brand.status === "suspended" || brand.status === "rejected") && (
                <button disabled={statusLoading} onClick={() => submitStatus("approved")}
                  className="text-sm bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700 disabled:opacity-50">
                  {statusLoading ? "Saving…" : "Reactivate"}
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── Danger Zone ─────────────────────────────────────────────────────── */}
      <section className="border border-red-200 dark:border-red-900/50 rounded-xl p-5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-red-500 mb-4">Danger Zone</h2>

        {showDeleteConfirm ? (
          <div className="space-y-3">
            <p className="text-sm text-red-600">
              Permanently delete <strong>{brand.name}</strong>? This removes all products, access rules, and gifting data and cannot be undone.
            </p>
            {deleteError && <p className="text-xs text-red-600">{deleteError}</p>}
            <div className="flex gap-2">
              <button onClick={() => { setShowDeleteConfirm(false); setDeleteError(null); }}
                className="text-sm border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/60">
                Cancel
              </button>
              <button disabled={deleteLoading} onClick={submitDelete}
                className="text-sm bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 disabled:opacity-50">
                {deleteLoading ? "Deleting…" : "Delete permanently"}
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowDeleteConfirm(true)}
            className="text-sm bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700">
            Delete brand
          </button>
        )}
      </section>

    </div>
  );
}
