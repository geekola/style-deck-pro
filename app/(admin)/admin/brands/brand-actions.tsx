"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function BrandActions({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approved" | "rejected" | null>(null);

  async function handleDecision(status: "approved" | "rejected") {
    setLoading(status);
    await fetch(`/api/admin/brands/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
    setLoading(null);
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => handleDecision("approved")}
        disabled={loading !== null}
        className="bg-black text-white text-xs px-3 py-1.5 rounded hover:bg-gray-800 disabled:opacity-50"
      >
        {loading === "approved" ? "Approving…" : "Approve"}
      </button>
      <button
        onClick={() => handleDecision("rejected")}
        disabled={loading !== null}
        className="border border-gray-300 text-xs px-3 py-1.5 rounded hover:bg-gray-50 disabled:opacity-50"
      >
        {loading === "rejected" ? "Rejecting…" : "Reject"}
      </button>
    </div>
  );
}
