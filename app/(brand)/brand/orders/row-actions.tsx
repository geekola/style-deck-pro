"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OrderRow } from "./orders-table";
import { ActionsMenu, type RowAction } from "@/components/admin/actions-menu";

type Mode = "none" | "ship";

export function RowActions({ row }: { row: OrderRow }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("none");
  const [tracking, setTracking] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleShip() {
    setLoading(true);
    await fetch(`/api/brand/orders/${row.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "shipped", trackingNumber: tracking || undefined }),
    });
    setLoading(false);
    setMode("none");
    router.refresh();
  }

  if (mode === "ship") {
    return (
      <ActionsMenu
        actions={[]}
        panel={
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              placeholder="Tracking number (optional)"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleShip();
                if (e.key === "Escape") setMode("none");
              }}
              className="text-xs border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1.5 w-40 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
            />
            <button
              onClick={handleShip}
              disabled={loading}
              className="bg-black dark:bg-white dark:text-black text-white text-xs px-3 py-1.5 rounded-md hover:bg-gray-800 disabled:opacity-50"
            >
              {loading ? "..." : "Confirm"}
            </button>
            <button
              onClick={() => setMode("none")}
              disabled={loading}
              className="border border-gray-200 dark:border-gray-700 text-xs px-3 py-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/60 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        }
      />
    );
  }

  const actions: RowAction[] = [
    { key: "invoice", label: "Print invoice", href: `/api/brand/orders/${row.id}/invoice` },
  ];

  if (row.status === "pending") {
    actions.push({ key: "ship", label: "Mark shipped", onClick: () => setMode("ship") });
  }

  return <ActionsMenu actions={actions} />;
}
