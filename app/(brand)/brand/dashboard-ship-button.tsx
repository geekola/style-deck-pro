"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DashboardShipButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleShip() {
    setLoading(true);
    await fetch(`/api/brand/orders/${orderId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "shipped" }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={handleShip}
      disabled={loading}
      className="text-xs border border-gray-200 dark:border-gray-700 rounded-md px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800/60 disabled:opacity-50 whitespace-nowrap"
    >
      {loading ? "…" : "Mark shipped"}
    </button>
  );
}
