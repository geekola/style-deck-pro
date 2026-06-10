"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type LogEntry = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  createdAt: string;
  actorName: string | null;
  actorEmail: string | null;
};

const ENTITY_TYPES = ["", "brand", "product", "order", "user", "invite", "brand_access", "gifting_allowance"];

const ACTION_COLORS: Record<string, string> = {
  "brand.approved": "bg-green-100 text-green-800",
  "brand.rejected": "bg-red-100 text-red-700",
  "brand.registered": "bg-blue-100 text-blue-800",
  "order.shipped": "bg-green-100 text-green-800",
  "order.placed": "bg-blue-100 text-blue-800",
  "user.suspended": "bg-red-100 text-red-700",
  "user.activated": "bg-green-100 text-green-800",
  "access.revoked": "bg-amber-100 text-amber-800",
  "access.granted": "bg-green-100 text-green-800",
  "product.deleted": "bg-red-100 text-red-700",
};

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityType, setEntityType] = useState("");

  async function load(type: string) {
    setLoading(true);
    const url = `/api/admin/audit?limit=200${type ? `&entityType=${type}` : ""}`;
    const res = await fetch(url);
    if (res.ok) setLogs(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(""); }, []);

  function handleFilter(type: string) {
    setEntityType(type);
    load(type);
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">Audit Log</h1>
        <Link href="/admin" className="text-sm text-gray-400 hover:text-black">← Dashboard</Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {ENTITY_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => handleFilter(t)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              entityType === t
                ? "bg-black text-white border-black"
                : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {t || "All"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading…</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-20 text-gray-400">No audit logs found.</div>
      ) : (
        <div className="space-y-1">
          {logs.map((log) => {
            const colorClass = ACTION_COLORS[log.action] ?? "bg-gray-100 text-gray-600";
            return (
              <div
                key={log.id}
                className="flex items-start gap-4 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {/* Timestamp */}
                <div className="text-xs text-gray-400 w-32 shrink-0 pt-0.5">
                  {new Date(log.createdAt).toLocaleDateString()}{" "}
                  <span className="block">
                    {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                {/* Action badge */}
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${colorClass}`}>
                  {log.action}
                </span>

                {/* Details */}
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-gray-700">
                    <span className="text-gray-400 text-xs capitalize">{log.entityType}</span>
                    {" "}
                    <span className="font-mono text-xs text-gray-500">
                      {log.entityId.length > 36 ? log.entityId : log.entityId.slice(0, 8)}
                    </span>
                  </div>
                  {log.actorEmail && (
                    <div className="text-xs text-gray-400 mt-0.5">
                      by {log.actorName ?? log.actorEmail}
                    </div>
                  )}
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <div className="text-xs text-gray-400 mt-0.5 font-mono truncate">
                      {JSON.stringify(log.metadata)}
                    </div>
                  )}
                </div>

                {/* IP */}
                {log.ip && (
                  <div className="text-xs text-gray-300 shrink-0">{log.ip}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
