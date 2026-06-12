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
  "brand.approved": "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400",
  "brand.rejected": "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
  "brand.registered": "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400",
  "order.shipped": "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400",
  "order.placed": "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400",
  "user.suspended": "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
  "user.activated": "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400",
  "access.revoked": "bg-amber-100 text-amber-800",
  "access.granted": "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400",
  "product.deleted": "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
};

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityType, setEntityType] = useState("");
  const [actorEmail, setActorEmail] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  function buildParams(extra: Record<string, string> = {}) {
    const params = new URLSearchParams();
    const type = extra.entityType ?? entityType;
    const email = extra.actorEmail ?? actorEmail;
    const fromDate = extra.from ?? from;
    const toDate = extra.to ?? to;

    if (type) params.set("entityType", type);
    if (email) params.set("actorEmail", email);
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);

    return params;
  }

  async function load(extra: Record<string, string> = {}) {
    setLoading(true);
    const params = buildParams(extra);
    params.set("limit", "200");
    const res = await fetch(`/api/admin/audit?${params.toString()}`);
    if (res.ok) setLogs(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleFilter(type: string) {
    setEntityType(type);
    load({ entityType: type });
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    load();
  }

  const exportUrl = `/api/admin/audit/export?${buildParams().toString()}`;

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">Audit Log</h1>
        <Link href="/admin" className="text-sm text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white dark:text-white">&larr; Dashboard</Link>
      </div>

      {/* Entity type filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {ENTITY_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => handleFilter(t)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              entityType === t
                ? "bg-black dark:bg-white dark:text-black text-white border-black dark:border-white"
                : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/60 dark:bg-gray-900"
            }`}
          >
            {t || "All"}
          </button>
        ))}
      </div>

      {/* Actor / date filters + export */}
      <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-3 mb-6">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-1">Actor email</label>
          <input
            type="text"
            value={actorEmail}
            onChange={(e) => setActorEmail(e.target.value)}
            placeholder="name@example.com"
            className="text-sm border border-gray-200 dark:border-gray-700 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-1">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="text-sm border border-gray-200 dark:border-gray-700 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-1">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="text-sm border border-gray-200 dark:border-gray-700 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
          />
        </div>
        <button
          type="submit"
          className="bg-black dark:bg-white dark:text-black text-white text-sm px-3 py-1.5 rounded-md hover:bg-gray-800"
        >
          Search
        </button>
        <a
          href={exportUrl}
          className="text-sm border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/60 dark:bg-gray-900 ml-auto"
        >
          Export CSV
        </a>
      </form>

      {loading ? (
        <div className="text-center py-20 text-gray-400 dark:text-gray-500">Loading...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-20 text-gray-400 dark:text-gray-500">No audit logs found.</div>
      ) : (
        <div className="space-y-1">
          {logs.map((log) => {
            const colorClass = ACTION_COLORS[log.action] ?? "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 dark:text-gray-500";
            return (
              <div
                key={log.id}
                className="flex items-start gap-4 px-4 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/60 dark:bg-gray-900 transition-colors"
              >
                {/* Timestamp */}
                <div className="text-xs text-gray-400 dark:text-gray-500 w-32 shrink-0 pt-0.5">
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
                  <div className="text-sm text-gray-700 dark:text-gray-300 dark:text-gray-600">
                    <span className="text-gray-400 dark:text-gray-500 text-xs capitalize">{log.entityType}</span>
                    {" "}
                    <span className="font-mono text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">
                      {log.entityId.length > 36 ? log.entityId : log.entityId.slice(0, 8)}
                    </span>
                  </div>
                  {log.actorEmail && (
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      by {log.actorName ?? log.actorEmail}
                    </div>
                  )}
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 font-mono truncate">
                      {JSON.stringify(log.metadata)}
                    </div>
                  )}
                </div>

                {/* IP */}
                {log.ip && (
                  <div className="text-xs text-gray-300 dark:text-gray-600 shrink-0">{log.ip}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
