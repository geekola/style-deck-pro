"use client";

import { useEffect, useState } from "react";

type Admin = {
  userId: string;
  name: string;
  email: string;
  status: "active" | "suspended";
  isYou: boolean;
};

type AddResult = {
  email: string;
  tempPassword?: string;
};

export function TeamSection() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  // Add form state
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addResult, setAddResult] = useState<AddResult | null>(null);

  async function load() {
    const res = await fetch("/api/brand/admins");
    if (res.ok) setAdmins(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setAddError(null);
    setAddResult(null);

    const res = await fetch("/api/brand/admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setAddError(data.error ?? "Something went wrong.");
      setSubmitting(false);
      return;
    }

    setAddResult(data);
    setEmail("");
    setSubmitting(false);
    await load();
  }

  async function handleRemove(admin: Admin) {
    if (!confirm(`Remove ${admin.email} from this brand's team?`)) return;
    setRemovingId(admin.userId);
    setListError(null);

    const res = await fetch(`/api/brand/admins/${admin.userId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setListError(data.error ?? "Something went wrong.");
      setRemovingId(null);
      return;
    }

    setRemovingId(null);
    await load();
  }

  return (
    <section>
      <h2 className="text-xs uppercase tracking-widest text-gray-400 border-b-2 border-black dark:border-white pb-2 mb-4 font-semibold">
        Team
      </h2>

      <p className="text-xs text-gray-400 mb-3">
        Other people who can manage this brand&apos;s products, customers, gifting, and orders.
      </p>

      {loading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : (
        <div className="space-y-2 mb-4">
          {admins.length === 0 && (
            <p className="text-sm text-gray-400">No other admins yet.</p>
          )}
          {admins.map((a) => (
            <div
              key={a.userId}
              className="flex items-center justify-between gap-3 text-sm border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5"
            >
              <div className="truncate">
                <span className="font-medium text-gray-900 dark:text-white">{a.name}</span>{" "}
                <span className="text-gray-500 dark:text-gray-400">{a.email}</span>
                {a.isYou && (
                  <span className="ml-2 text-xs text-gray-400">(you)</span>
                )}
                {a.status === "suspended" && (
                  <span className="ml-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                    Suspended
                  </span>
                )}
              </div>
              {!a.isYou && (
                <button
                  onClick={() => handleRemove(a)}
                  disabled={removingId === a.userId}
                  className="text-xs text-red-600 hover:text-red-700 border border-red-200 rounded-md px-2.5 py-1 shrink-0 disabled:opacity-50"
                >
                  {removingId === a.userId ? "Removing..." : "Remove"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {listError && <p className="text-xs text-red-500 mb-3">{listError}</p>}

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="teammate@example.com"
          className="flex-1 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
        />
        <button
          type="submit"
          disabled={submitting || !email}
          className="px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-black dark:bg-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 shrink-0"
        >
          {submitting ? "Adding..." : "Add admin"}
        </button>
      </form>

      {addError && <p className="text-xs text-red-500 mt-2">{addError}</p>}

      {addResult && (
        <div className="text-xs text-gray-700 dark:text-gray-300 mt-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-2">
          {addResult.tempPassword ? (
            <>
              <p>
                Created brand admin <span className="font-medium">{addResult.email}</span>.
              </p>
              <p className="mt-1">
                Temporary password: <span className="font-mono font-medium">{addResult.tempPassword}</span>
              </p>
              <p className="mt-1 text-gray-400">Share this securely — it won&apos;t be shown again.</p>
            </>
          ) : (
            <p>Added <span className="font-medium">{addResult.email}</span> to this brand&apos;s team.</p>
          )}
        </div>
      )}
    </section>
  );
}
