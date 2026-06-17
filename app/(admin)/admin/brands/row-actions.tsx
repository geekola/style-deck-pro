"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BrandRow } from "./brands-table";
import { ActionsMenu, type RowAction } from "@/components/admin/actions-menu";

const inputClass =
  "w-full text-xs border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white";

type Mode = "none" | "delete" | "reason" | "tempPassword";

export function RowActions({ row }: { row: BrandRow }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("none");
  const [reasonType, setReasonType] = useState<"rejected" | "suspended" | null>(null);
  const [reason, setReason] = useState("");
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitStatus(newStatus: "approved" | "rejected" | "suspended", reasonText?: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/brands/${row.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, reason: reasonText }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Something went wrong");
        return;
      }

      const data = await res.json();
      setReason("");
      setReasonType(null);

      if (data.tempPassword) {
        setTempPassword(data.tempPassword);
        setMode("tempPassword");
        return;
      }

      setMode("none");
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handleDone() {
    setTempPassword(null);
    setMode("none");
    router.refresh();
  }

  async function submitDelete() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/brands/${row.id}`, { method: "DELETE" });

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

  if (mode === "tempPassword" && tempPassword) {
    return (
      <ActionsMenu
        actions={[]}
        panel={
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs space-y-2">
            <p className="font-medium text-amber-900">Brand approved — temporary password:</p>
            <code className="block bg-white dark:bg-gray-950 border border-amber-200 rounded px-2 py-1 font-mono text-sm select-all">
              {tempPassword}
            </code>
            <p className="text-amber-700">Share this securely — it won&apos;t be shown again.</p>
            <button
              onClick={handleDone}
              className="bg-black dark:bg-white dark:text-black text-white text-xs px-3 py-1.5 rounded-md hover:bg-gray-800"
            >
              Done
            </button>
          </div>
        }
      />
    );
  }

  if (mode === "reason" && reasonType) {
    return (
      <ActionsMenu
        actions={[]}
        panel={
          <div className="space-y-2">
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                reasonType === "rejected"
                  ? "Reason for rejection (optional)"
                  : "Reason for suspension (optional)"
              }
              rows={2}
              className={inputClass}
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setMode("none");
                  setReasonType(null);
                  setReason("");
                  setError(null);
                }}
                className="border border-gray-200 dark:border-gray-700 text-xs px-3 py-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/60 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                disabled={loading}
                onClick={() => submitStatus(reasonType, reason.trim() || undefined)}
                className="bg-black dark:bg-white dark:text-black text-white text-xs px-3 py-1.5 rounded-md hover:bg-gray-800 disabled:opacity-50"
              >
                {loading ? "Saving…" : "Confirm"}
              </button>
            </div>
          </div>
        }
      />
    );
  }

  if (mode === "delete") {
    return (
      <ActionsMenu
        actions={[]}
        panel={
          <div className="space-y-2">
            <p className="text-xs text-red-600">
              Permanently delete <span className="font-medium">{row.name}</span>? This removes its
              products, access rules, and gifting data and can&apos;t be undone.
            </p>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-2 justify-end">
              <button
                disabled={loading}
                onClick={() => {
                  setMode("none");
                  setError(null);
                }}
                className="border border-gray-200 dark:border-gray-700 text-xs px-3 py-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/60 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                disabled={loading}
                onClick={submitDelete}
                className="bg-red-600 text-white text-xs px-3 py-1.5 rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? "Deleting…" : "Delete permanently"}
              </button>
            </div>
          </div>
        }
      />
    );
  }

  const actions: RowAction[] = [];

  if (row.status === "pending") {
    actions.push({ key: "approve", label: "Approve", onClick: () => submitStatus("approved"), disabled: loading });
    actions.push({
      key: "reject",
      label: "Reject",
      onClick: () => {
        setReasonType("rejected");
        setMode("reason");
      },
    });
  }

  if (row.status === "approved") {
    actions.push({
      key: "suspend",
      label: "Suspend",
      onClick: () => {
        setReasonType("suspended");
        setMode("reason");
      },
      variant: "danger",
    });
  }

  if (row.status === "suspended") {
    actions.push({ key: "reactivate", label: "Reactivate", onClick: () => submitStatus("approved"), disabled: loading });
  }

  if (row.status === "rejected") {
    actions.push({ key: "approve", label: "Approve", onClick: () => submitStatus("approved"), disabled: loading });
  }

  // Edit navigates to the brand profile page (which has a full edit form)
  actions.push({ key: "edit", label: "Edit", onClick: () => router.push(`/admin/brands/${row.id}`) });
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
