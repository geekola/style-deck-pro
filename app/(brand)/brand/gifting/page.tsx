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

type Customer = {
  id: string;
  name: string;
  email: string;
};

export default function BrandGiftingPage() {
  const [allowances, setAllowances] = useState<Allowance[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState<string | null>(null);

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

  function pct(used: number, total: number) {
    if (total === 0) return 0;
    return Math.min(100, Math.round((used / total) * 100));
  }

  const customersWithoutAllowance = customers.filter(
    (c) => !allowances.some((a) => a.customerId === c.id)
  );

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-8">Gifting allowances</h1>

      {!loading && (
        <AddAllowanceForm
          customers={customersWithoutAllowance}
          onCreated={load}
        />
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

            return (
              <div key={a.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-medium">{a.customerName}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 capitalize">
                      {a.periodType} period
                    </div>
                  </div>
                  <button
                    onClick={() => handleReset(a.id)}
                    disabled={resetting === a.id}
                    className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white dark:text-white border border-gray-200 dark:border-gray-700 rounded px-2 py-1"
                  >
                    {resetting === a.id ? "Resetting..." : "Reset usage"}
                  </button>
                </div>

                <div className="flex items-center gap-3 text-sm mb-2">
                  <span className="text-gray-500 dark:text-gray-400 dark:text-gray-500">
                    ${used.toFixed(2)} used of ${total.toFixed(2)}
                  </span>
                  <span className="font-medium text-green-700 dark:text-green-400">
                    ${remaining.toFixed(2)} remaining
                  </span>
                </div>

                <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-black dark:bg-white dark:text-black rounded-full transition-all"
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

function AddAllowanceForm({
  customers,
  onCreated,
}: {
  customers: Customer[];
  onCreated: () => void;
}) {
  const [customerId, setCustomerId] = useState("");
  const [amount, setAmount] = useState("");
  const [periodType, setPeriodType] = useState<"rolling" | "calendar">("rolling");
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

    setSubmitting(true);
    const res = await fetch("/api/brand/gifting", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId, amountCents, periodType }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong.");
      setSubmitting(false);
      return;
    }

    setCustomerId("");
    setAmount("");
    setPeriodType("rolling");
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
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-1.5">Customer</label>
        <select
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
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
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-1.5">Amount ($)</label>
        <input
          type="number"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="500.00"
          className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
        />
      </div>

      <div className="w-36">
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-1.5">Period</label>
        <select
          value={periodType}
          onChange={(e) => setPeriodType(e.target.value as "rolling" | "calendar")}
          className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
        >
          <option value="rolling">Rolling</option>
          <option value="calendar">Calendar</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="bg-black dark:bg-white dark:text-black text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-gray-800 disabled:opacity-50"
      >
        {submitting ? "Saving..." : "Set allowance"}
      </button>

      {error && <p className="text-sm text-red-600 w-full">{error}</p>}
    </form>
  );
}
