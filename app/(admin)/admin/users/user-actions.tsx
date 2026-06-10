"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function UserActions({
  userId,
  currentStatus,
}: {
  userId: string;
  currentStatus: "active" | "suspended";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    await fetch(`/api/admin/users/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerStatus: currentStatus === "active" ? "suspended" : "active",
      }),
    });
    router.refresh();
    setLoading(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`text-xs px-3 py-1 rounded border disabled:opacity-50 ${
        currentStatus === "active"
          ? "border-red-200 text-red-600 hover:bg-red-50"
          : "border-green-200 text-green-700 hover:bg-green-50"
      }`}
    >
      {loading ? "…" : currentStatus === "active" ? "Suspend" : "Activate"}
    </button>
  );
}
