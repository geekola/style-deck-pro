"use client";

import { useEffect, useState } from "react";

type Allowance = {
  id: string;
  customerId: string;
  customerName: string;
  periodType: "rolling" | "calendar";
  amountCents: number;
  usedCents: number;
  periodStart: string;
  manualResetAt: string | null;
};

export default function BrandGiftingPage() {
  const [allowances, setAllowances] = useState<Allowance[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/brand/gifting");
    if (res.ok) setAllowances(await res.json());
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

  function pct(used: number, total: number) {
    if (total === 0) return 0;
    return Math.min(100, Math.round((used / total) * 100));
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-8">Gifting allowances</h1>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading…</div>
      ) : allowances.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          No gifting allowances set. Go to Customers to grant access and set allowances.
        </div>
      ) : (
        <div className="space-y-4">
          {allowances.map((a) => {
            const used = a.usedCents / 100;
            const total = a.amountCents / 100;
            const remaining = total - used;
            const p = pct(a.usedCents, a.amountCents);

            return (
              <div key={a.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-medium">{a.customerName}</div>
                    <div className="text-xs text-gray-500 capitalize">
                      {a.periodType} period
                    </div>
                  </div>
                  <button
                    onClick={() => handleReset(a.id)}
                    disabled={resetting === a.id}
                    className="text-xs text-gray-500 hover:text-black border border-gray-200 rounded px-2 py-1"
                  >
                    {resetting === a.id ? "Resetting…" : "Reset usage"}
                  </button>
                </div>

                <div className="flex items-center gap-3 text-sm mb-2">
                  <span className="text-gray-500">
                    ${used.toFixed(2)} used of ${total.toFixed(2)}
                  </span>
                  <span className="font-medium text-green-700">
                    ${remaining.toFixed(2)} remaining
                  </span>
                </div>

                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-black rounded-full transition-all"
                    style={{ width: `${p}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
