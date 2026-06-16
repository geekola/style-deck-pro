"use client";

import { useEffect, useState } from "react";
import { CustomersTable, type CustomerRow } from "./customers-table";

export default function BrandCustomersPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  async function load() {
    const res = await fetch("/api/brand/customers");
    if (res.ok) {
      setCustomers(await res.json());
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

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
    await fetch("/api/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail }),
    });
    setInviteEmail("");
    setInviteSuccess(true);
    setInviting(false);
    setTimeout(() => setInviteSuccess(false), 3000);
  }

  const stats = {
    total: customers.length,
    withAccess: customers.filter((c) => c.hasAccess).length,
    noAccess: customers.filter((c) => !c.hasAccess).length,
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-start justify-between mb-8">
        <h1 className="text-2xl font-semibold">Clients</h1>

        <form onSubmit={sendInvite} className="flex gap-2">
          <input
            type="email"
            required
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="Email address"
            className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
          />
          <button
            type="submit"
            disabled={inviting}
            className="bg-black dark:bg-white dark:text-black text-white text-sm px-4 py-2 rounded-md hover:bg-gray-800 disabled:opacity-50"
          >
            {inviteSuccess ? "Sent!" : "Send invite"}
          </button>
        </form>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400 dark:text-gray-500">Loading...</div>
      ) : (
        <CustomersTable rows={customers} stats={stats} onToggleAccess={toggleAccess} />
      )}
    </div>
  );
}
