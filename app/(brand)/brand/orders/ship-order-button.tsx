"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ShipOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tracking, setTracking] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleShip() {
    setLoading(true);
    await fetch(`/api/brand/orders/${orderId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "shipped", trackingNumber: tracking || undefined }),
    });
    setOpen(false);
    setLoading(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs bg-black dark:bg-white dark:text-black text-white px-3 py-1.5 rounded-lg hover:bg-gray-800"
      >
        Mark shipped
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={tracking}
        onChange={(e) => setTracking(e.target.value)}
        placeholder="Tracking number (optional)"
        className="text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-1.5 w-44 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
        autoFocus
        onKeyDown={(e) => { if (e.key === "Enter") handleShip(); if (e.key === "Escape") setOpen(false); }}
      />
      <button
        onClick={handleShip}
        disabled={loading}
        className="text-xs bg-black dark:bg-white dark:text-black text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 disabled:opacity-50"
      >
        {loading ? "…" : "Confirm"}
      </button>
      <button
        onClick={() => setOpen(false)}
        className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:text-gray-600"
      >
        Cancel
      </button>
    </div>
  );
}
