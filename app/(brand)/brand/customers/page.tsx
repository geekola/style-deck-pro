"use client";

import { useEffect, useState } from "react";
import { CustomersTable, type CustomerRow } from "./customers-table";

type AccessPolicy = "open" | "selective" | "invite_only";

const POLICY_OPTIONS: { value: AccessPolicy; label: string; description: string }[] = [
  {
    value: "open",
    label: "Open",
    description: "All registered customers can discover your products.",
  },
  {
    value: "selective",
    label: "Selective",
    description: "Only customers you grant access to can see your products.",
  },
  {
    value: "invite_only",
    label: "Invite only",
    description: "Customers must be invited and granted access.",
  },
];

export default function BrandCustomersPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [policy, setPolicy] = useState<AccessPolicy>("open");
  const [loading, setLoading] = useState(true);
  const [policyUpdating, setPolicyUpdating] = useState(false);
  const [policyError, setPolicyError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<"idle" | "sent" | "error">("idle");

  async function load() {
    const [brandRes, customerRes] = await Promise.all([
      fetch("/api/brand"),
      fetch("/api/brand/customers"),
    ]);
    if (brandRes.ok) {
      const brand = await brandRes.json();
      setPolicy(brand.accessPolicy);
    }
    if (customerRes.ok) {
      setCustomers(await customerRes.json());
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handlePolicyChange(newPolicy: AccessPolicy) {
    if (newPolicy === policy || policyUpdating) return;
    setPolicyUpdating(true);
    setPolicyError(null);
    const res = await fetch("/api/brand/access", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessPolicy: newPolicy }),
    });
    if (res.ok) {
      setPolicy(newPolicy);
    } else {
      const data = await res.json().catch(() => ({}));
      setPolicyError(data.error ?? "Failed to update policy.");
    }
    setPolicyUpdating(false);
  }

  async function toggleAccess(customerId: string, grant: boolean) {
    await fetch("/api/brand/access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId, grant }),
    });
    load();
  }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setInviteResult("idle");
    const res = await fetch("/api/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail }),
    });
    setInviting(false);
    if (res.ok) {
      setInviteEmail("");
      setInviteResult("sent");
      setTimeout(() => setInviteResult("idle"), 3000);
    } else {
      setInviteResult("error");
    }
  }

  const stats = {
    total: customers.length,
    withAccess: customers.filter((c) => c.hasAccess).length,
    noAccess: customers.filter((c) => !c.hasAccess).length,
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <h1 className="text-2xl font-semibold">Clients</h1>

        {/* Invite form — shown for selective/invite_only */}
        {policy !== "open" && (
          <form onSubmit={sendInvite} className="flex gap-2">
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Email to invite"
              className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
            />
            <button
              type="submit"
              disabled={inviting}
              className="bg-black dark:bg-white dark:text-black text-white text-sm px-4 py-2 rounded-md hover:bg-gray-800 disabled:opacity-50"
            >
              {inviting ? "Sending..." : inviteResult === "sent" ? "Sent!" : "Send invite"}
            </button>
            {inviteResult === "error" && (
              <p className="text-xs text-red-600 self-center">Failed to send.</p>
            )}
          </form>
        )}
      </div>

      {/* Access policy picker */}
      <div className="mb-8 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold">Access policy</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Controls which customers can discover your products.
            </p>
          </div>
          {policyUpdating && (
            <span className="text-xs text-gray-400 dark:text-gray-500">Saving...</span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {POLICY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              disabled={policyUpdating}
              onClick={() => handlePolicyChange(opt.value)}
              className={`text-left rounded-lg border p-4 transition-colors disabled:opacity-60 ${
                policy === opt.value
                  ? "border-black dark:border-white bg-black dark:bg-white text-white dark:text-black"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500"
              }`}
            >
              <p className={`text-sm font-medium mb-1 ${policy === opt.value ? "" : "text-gray-900 dark:text-white"}`}>
                {opt.label}
              </p>
              <p className={`text-xs leading-snug ${
                policy === opt.value
                  ? "text-white/70 dark:text-black/60"
                  : "text-gray-500 dark:text-gray-400"
              }`}>
                {opt.description}
              </p>
            </button>
          ))}
        </div>

        {policyError && (
          <p className="text-xs text-red-600 mt-3">{policyError}</p>
        )}
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400 dark:text-gray-500">Loading...</div>
      ) : (
        <CustomersTable
          rows={customers}
          stats={stats}
          accessPolicy={policy}
          onToggleAccess={toggleAccess}
        />
      )}
    </div>
  );
}
