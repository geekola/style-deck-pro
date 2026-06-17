"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ProductRow } from "./products-table";
import { ActionsMenu, type RowAction } from "@/components/admin/actions-menu";

type Mode = "none" | "delete";

export function RowActions({ row }: { row: ProductRow }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("none");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function setVisibility(visibility: "draft" | "hidden" | "live") {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/brand/products/${row.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Something went wrong");
        return;
      }

      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function submitDelete() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/brand/products/${row.id}`, { method: "DELETE" });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Something went wrong");
        return;
      }

      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (mode === "delete") {
    return (
      <ActionsMenu
        actions={[]}
        panel={
          <div className="space-y-2">
            <p className="text-xs text-red-600">
              Permanently delete <span className="font-medium">{row.name}</span>? This cannot be undone.
            </p>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-2 justify-end">
              <button
                disabled={loading}
                onClick={() => { setMode("none"); setError(null); }}
                className="border border-gray-200 dark:border-gray-700 text-xs px-3 py-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/60 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                disabled={loading}
                onClick={submitDelete}
                className="bg-red-600 text-white text-xs px-3 py-1.5 rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? "Deleting..." : "Delete permanently"}
              </button>
            </div>
          </div>
        }
      />
    );
  }

  const actions: RowAction[] = [];

  if (row.visibility !== "live") {
    actions.push({
      key: "publish",
      label: "Go Live",
      onClick: () => setVisibility("live"),
      disabled: loading,
    });
  }
  if (row.visibility !== "hidden") {
    actions.push({
      key: "hide",
      label: "Hide",
      onClick: () => setVisibility("hidden"),
      disabled: loading,
    });
  }
  if (row.visibility !== "draft") {
    actions.push({
      key: "draft",
      label: "Set to Draft",
      onClick: () => setVisibility("draft"),
      disabled: loading,
    });
  }
  actions.push({ key: "delete", label: "Delete", onClick: () => setMode("delete"), variant: "danger" });

  return (
    <div className="relative inline-block text-left">
      <ActionsMenu actions={actions} />
      {error && (
        <p className="absolute right-0 mt-1 w-44 text-xs text-red-600 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-md p-2 shadow-lg z-10">
          {error}
        </p>
      )}
    </div>
  );
}
