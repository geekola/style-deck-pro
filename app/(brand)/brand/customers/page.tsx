"use client";

import { useEffect, useState } from "react";

type Customer = {
  id: string;
  name: string;
  email: string;
  type: string;
  industry: string;
  hasAccess: boolean;
};

export default function BrandCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
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

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-start justify-between mb-8">
        <h1 className="text-2xl font-semibold">Customers</h1>

        <form onSubmit={sendInvite} className="flex gap-2">
          <input
            type="email"
            required
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="Email address"
            className="border border-gray-300 rounded-md px-3 py-2 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-black"
          />
          <button
            type="submit"
            disabled={inviting}
            className="bg-black text-white text-sm px-4 py-2 rounded-md hover:bg-gray-800 disabled:opacity-50"
          >
            {inviteSuccess ? "Sent!" : "Send invite"}
          </button>
        </form>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading…</div>
      ) : customers.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          No customers yet. Send an invite to get started.
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-3 font-medium">Name</th>
              <th className="pb-3 font-medium">Type</th>
              <th className="pb-3 font-medium">Industry</th>
              <th className="pb-3 font-medium">Access</th>
              <th className="pb-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {customers.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="py-3">
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-gray-400">{c.email}</div>
                </td>
                <td className="py-3 capitalize text-gray-600">{c.type}</td>
                <td className="py-3 capitalize text-gray-600">{c.industry}</td>
                <td className="py-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      c.hasAccess
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {c.hasAccess ? "Granted" : "No access"}
                  </span>
                </td>
                <td className="py-3 text-right">
                  <button
                    onClick={() => toggleAccess(c.id, !c.hasAccess)}
                    className="text-xs text-gray-500 hover:text-black"
                  >
                    {c.hasAccess ? "Revoke" : "Grant"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
