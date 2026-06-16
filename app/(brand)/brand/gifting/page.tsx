"use client";

import { useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Allowance = {
  id: string;
  customerId: string;
  customerName: string;
  periodType: "rolling" | "calendar";
  amountCents: number;
  usedCents: number;
  periodStart: string;
  periodDays: number | null;
  manualResetAt: string | null;
};

type UIPeriodType = "30" | "60" | "90" | "custom";

type Customer = {
  id: string;
  name: string;
  email: string;
};

type Measurements = {
  gender: string;
  unitSystem: string;
  height: string | null;
  weight: string | null;
  shoeSize: string | null;
  shoeWidth: string | null;
  chest: string | null;
  waist: string | null;
  hips: string | null;
  neck: string | null;
  shoulderWidth: string | null;
  sleeveLength: string | null;
  inseam: string | null;
  extended: Record<string, string> | null;
  updatedAt: string;
};

type CustomerProfile = {
  id: string;
  name: string;
  email: string;
  type: string;
  industry: string;
  status: string;
  createdAt: string;
  measurements: Measurements | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nextCalendarReset(periodStart: string): string {
  const start = new Date(periodStart);
  const now = new Date();
  // First of next month after the current cycle
  const next = new Date(now.getFullYear(), now.getMonth() + 1, start.getDate() || 1);
  return next.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BrandGiftingPage() {
  const [allowances, setAllowances] = useState<Allowance[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editUIPeriod, setEditUIPeriod] = useState<UIPeriodType>("30");
  const [editPeriodStart, setEditPeriodStart] = useState("");
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);

  async function load() {
    const [allowanceRes, customerRes] = await Promise.all([
      fetch("/api/brand/gifting"),
      fetch("/api/brand/customers"),
    ]);
    if (allowanceRes.ok) setAllowances(await allowanceRes.json());
    if (customerRes.ok) setCustomers(await customerRes.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleReset(id: string) {
    setResetting(id);
    await fetch(`/api/brand/gifting/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reset: true }),
    });
    await load();
    setResetting(null);
  }

  async function handleRemove(id: string) {
    if (!confirm("Remove this gifting allowance? The customer will no longer be able to use it.")) return;
    setRemoving(id);
    await fetch(`/api/brand/gifting/${id}`, { method: "DELETE" });
    await load();
    setRemoving(null);
  }

  function startEdit(a: Allowance) {
    setEditingId(a.id);
    setEditAmount((a.amountCents / 100).toString());
    // Derive UI period type from stored data
    if (a.periodType === "calendar") {
      setEditUIPeriod("custom");
    } else if (a.periodDays === 60) {
      setEditUIPeriod("60");
    } else if (a.periodDays === 90) {
      setEditUIPeriod("90");
    } else {
      setEditUIPeriod("30");
    }
    setEditPeriodStart(a.periodStart ? a.periodStart.slice(0, 10) : "");
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError(null);
  }

  async function handleSaveEdit(id: string) {
    const amountCents = Math.round(parseFloat(editAmount) * 100);
    if (!amountCents || amountCents <= 0) {
      setEditError("Enter an amount greater than $0.");
      return;
    }
    if (editUIPeriod === "custom" && !editPeriodStart) {
      setEditError("Enter a start date for the custom period.");
      return;
    }
    setSaving(true);
    setEditError(null);
    const isCustom = editUIPeriod === "custom";
    const periodDays = isCustom ? null : parseInt(editUIPeriod, 10);
    const body: Record<string, unknown> = {
      amountCents,
      periodType: isCustom ? "calendar" : "rolling",
      periodDays,
    };
    if (isCustom && editPeriodStart) body.periodStart = new Date(editPeriodStart).toISOString();
    else if (!isCustom) body.periodStart = new Date().toISOString();
    const res = await fetch(`/api/brand/gifting/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setEditError(data.error ?? "Something went wrong.");
      return;
    }
    setEditingId(null);
    await load();
  }

  function pct(used: number, total: number) {
    if (total === 0) return 0;
    return Math.min(100, Math.round((used / total) * 100));
  }

  const customersWithoutAllowance = customers.filter(
    (c) => !allowances.some((a) => a.customerId === c.id)
  );

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Gifting allowances</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          Rolling periods reset manually — use the Reset usage button when the period expires.
          Custom periods let you set a specific start date; usage resets at the start of each calendar month.
        </p>
      </div>

      {!loading && (
        <AddAllowanceForm customers={customersWithoutAllowance} onCreated={load} />
      )}

      {loading ? (
        <div className="text-center py-20 text-gray-400 dark:text-gray-500">Loading...</div>
      ) : allowances.length === 0 ? (
        <div className="text-center py-20 text-gray-400 dark:text-gray-500">
          No gifting allowances set. Use the form above to set one for a customer.
        </div>
      ) : (
        <div className="space-y-4">
          {allowances.map((a) => {
            const used = a.usedCents / 100;
            const total = a.amountCents / 100;
            const remaining = total - used;
            const p = pct(a.usedCents, a.amountCents);
            const isEditing = editingId === a.id;

            return (
              <div key={a.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <button
                      onClick={() => setProfileId(a.customerId)}
                      className="font-medium hover:underline text-left"
                    >
                      {a.customerName}
                    </button>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 space-x-2">
                      <span>
                        {a.periodType === "rolling" && a.periodDays
                          ? `${a.periodDays}-day rolling period`
                          : a.periodType === "calendar"
                            ? "Custom period"
                            : "Rolling period"}
                      </span>
                      <span className="text-gray-300 dark:text-gray-600">·</span>
                      <span>Started {fmtDate(a.periodStart)}</span>
                      {a.periodType === "calendar" && (
                        <>
                          <span className="text-gray-300 dark:text-gray-600">·</span>
                          <span>Resets {nextCalendarReset(a.periodStart)}</span>
                        </>
                      )}
                      {a.manualResetAt && (
                        <>
                          <span className="text-gray-300 dark:text-gray-600">·</span>
                          <span>Manually reset {fmtDate(a.manualResetAt)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {!isEditing && (
                      <button
                        onClick={() => startEdit(a)}
                        className="text-xs text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white border border-gray-200 dark:border-gray-700 rounded px-2 py-1"
                      >
                        Edit
                      </button>
                    )}
                    <button
                      onClick={() => handleReset(a.id)}
                      disabled={resetting === a.id}
                      className="text-xs text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white border border-gray-200 dark:border-gray-700 rounded px-2 py-1 disabled:opacity-50"
                    >
                      {resetting === a.id ? "Resetting..." : "Reset usage"}
                    </button>
                    <button
                      onClick={() => handleRemove(a.id)}
                      disabled={removing === a.id}
                      className="text-xs text-red-600 hover:text-red-700 border border-red-200 rounded px-2 py-1 disabled:opacity-50"
                    >
                      {removing === a.id ? "Removing..." : "Remove"}
                    </button>
                  </div>
                </div>

                {isEditing ? (
                  <div className="flex flex-wrap items-end gap-3 mb-3">
                    <div className="w-32">
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Amount ($)</label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div className="w-44">
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Period</label>
                      <select
                        value={editUIPeriod}
                        onChange={(e) => setEditUIPeriod(e.target.value as UIPeriodType)}
                        className={inputClass}
                      >
                        <option value="30">30 days (rolling)</option>
                        <option value="60">60 days (rolling)</option>
                        <option value="90">90 days (rolling)</option>
                        <option value="custom">Custom (pick start date)</option>
                      </select>
                    </div>
                    {editUIPeriod === "custom" && (
                      <div className="w-44">
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Start date</label>
                        <input
                          type="date"
                          value={editPeriodStart}
                          onChange={(e) => setEditPeriodStart(e.target.value)}
                          className={inputClass}
                        />
                      </div>
                    )}
                    <button
                      onClick={() => handleSaveEdit(a.id)}
                      disabled={saving}
                      className="bg-black dark:bg-white dark:text-black text-white text-sm px-4 py-2 rounded-md hover:bg-gray-800 disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={cancelEdit}
                      disabled={saving}
                      className="text-sm text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white px-2 py-2"
                    >
                      Cancel
                    </button>
                    {editError && <p className="text-sm text-red-600 w-full">{editError}</p>}
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 text-sm mb-2">
                      <span className="text-gray-500 dark:text-gray-400">
                        ${used.toFixed(2)} used of ${total.toFixed(2)}
                      </span>
                      <span className="font-medium text-green-700 dark:text-green-400">
                        ${remaining.toFixed(2)} remaining
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-black dark:bg-white rounded-full transition-all"
                        style={{ width: `${p}%` }}
                      />
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {profileId && (
        <CustomerProfilePanel customerId={profileId} onClose={() => setProfileId(null)} />
      )}
    </div>
  );
}

// ─── Add Allowance Form ────────────────────────────────────────────────────────

function AddAllowanceForm({
  customers,
  onCreated,
}: {
  customers: Customer[];
  onCreated: () => void;
}) {
  const [customerId, setCustomerId] = useState("");
  const [amount, setAmount] = useState("");
  const [uiPeriod, setUIPeriod] = useState<UIPeriodType>("30");
  const [periodStart, setPeriodStart] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const amountCents = Math.round(parseFloat(amount) * 100);
    if (!customerId || !amountCents || amountCents <= 0) {
      setError("Choose a customer and enter an amount greater than $0.");
      return;
    }
    if (uiPeriod === "custom" && !periodStart) {
      setError("Enter a start date for the custom period.");
      return;
    }

    setSubmitting(true);
    const isCustom = uiPeriod === "custom";
    const periodDays = isCustom ? null : parseInt(uiPeriod, 10);
    const body: Record<string, unknown> = {
      customerId,
      amountCents,
      periodType: isCustom ? "calendar" : "rolling",
      periodDays,
    };
    if (isCustom && periodStart) body.periodStart = new Date(periodStart).toISOString();
    else if (!isCustom) body.periodStart = new Date().toISOString();

    const res = await fetch("/api/brand/gifting", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong.");
      setSubmitting(false);
      return;
    }

    setCustomerId("");
    setAmount("");
    setUIPeriod("30");
    setPeriodStart("");
    setSubmitting(false);
    onCreated();
  }

  if (customers.length === 0) return null;

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-8 flex flex-wrap items-end gap-3"
    >
      <div className="flex-1 min-w-[180px]">
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Customer</label>
        <select
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          className={inputClass}
        >
          <option value="">Select a customer...</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.email})
            </option>
          ))}
        </select>
      </div>

      <div className="w-32">
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Amount ($)</label>
        <input
          type="number"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="500.00"
          className={inputClass}
        />
      </div>

      <div className="w-52">
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Period</label>
        <select
          value={uiPeriod}
          onChange={(e) => setUIPeriod(e.target.value as UIPeriodType)}
          className={inputClass}
        >
          <option value="30">30 days (rolling)</option>
          <option value="60">60 days (rolling)</option>
          <option value="90">90 days (rolling)</option>
          <option value="custom">Custom (pick start date)</option>
        </select>
      </div>

      {uiPeriod === "custom" && (
        <div className="w-44">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Start date</label>
          <input
            type="date"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
            className={inputClass}
          />
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="bg-black dark:bg-white dark:text-black text-white text-sm px-4 py-2 rounded-md hover:bg-gray-800 disabled:opacity-50"
      >
        {submitting ? "Saving..." : "Set allowance"}
      </button>

      {error && <p className="text-sm text-red-600 w-full">{error}</p>}
    </form>
  );
}

// ─── Customer Profile Panel ────────────────────────────────────────────────────

function CustomerProfilePanel({
  customerId,
  onClose,
}: {
  customerId: string;
  onClose: () => void;
}) {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/brand/customers/${customerId}`)
      .then((r) => r.json())
      .then((data) => { if (!cancelled) setProfile(data); })
      .catch(() => { if (!cancelled) setError("Failed to load profile."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [customerId]);

  const m = profile?.measurements;

  const measureFields = m
    ? [
        { label: "Height", value: m.height },
        { label: "Weight", value: m.weight },
        { label: "Chest", value: m.chest },
        { label: "Waist", value: m.waist },
        { label: "Hips", value: m.hips },
        { label: "Neck", value: m.neck },
        { label: "Shoulder", value: m.shoulderWidth },
        { label: "Sleeve", value: m.sleeveLength },
        { label: "Inseam", value: m.inseam },
        { label: "Shoe size", value: m.shoeSize },
        { label: "Shoe width", value: m.shoeWidth },
        ...(m.extended
          ? Object.entries(m.extended).map(([k, v]) => ({ label: k, value: v }))
          : []),
      ].filter((f) => f.value)
    : [];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 dark:bg-black/50 z-40"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-white dark:bg-gray-950 border-l border-gray-200 dark:border-gray-700 z-50 overflow-y-auto shadow-xl">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Client profile</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
            >
              &times;
            </button>
          </div>

          {loading && (
            <p className="text-sm text-gray-400 dark:text-gray-500">Loading...</p>
          )}

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          {profile && (
            <div className="space-y-6">
              <div>
                <p className="font-medium text-base">{profile.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{profile.email}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoField label="Type" value={profile.type.replace(/_/g, " ")} capitalize />
                <InfoField label="Industry" value={profile.industry.replace(/_/g, " ")} capitalize />
                <InfoField label="Status" value={profile.status} capitalize />
                <InfoField label="Member since" value={fmtDate(profile.createdAt)} />
              </div>

              {m && measureFields.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                      Measurements
                    </h3>
                    <span className="text-xs text-gray-400 dark:text-gray-500 capitalize">
                      {m.gender} / {m.unitSystem}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    {measureFields.map((f) => (
                      <div key={f.label} className="flex gap-2 text-sm">
                        <span className="text-gray-400 dark:text-gray-500 w-24 shrink-0">{f.label}</span>
                        <span className="text-gray-800 dark:text-gray-200">{f.value}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
                    Updated {fmtDate(m.updatedAt)}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-400 dark:text-gray-500">No measurements on file.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function InfoField({
  label,
  value,
  capitalize,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div>
      <span className="block text-xs text-gray-400 dark:text-gray-500 mb-0.5">{label}</span>
      <span className={`text-sm text-gray-800 dark:text-gray-200 ${capitalize ? "capitalize" : ""}`}>
        {value}
      </span>
    </div>
  );
}

const inputClass =
  "w-full border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white bg-white dark:bg-gray-900";
