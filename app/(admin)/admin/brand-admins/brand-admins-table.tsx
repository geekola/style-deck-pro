"use client";

import { useMemo, useState } from "react";
import { RowActions } from "./row-actions";

export type BrandAdminRow = {
  userId: string;
  name: string;
  email: string;
  status: "active" | "suspended";
  joinedAt: string;
  brandId: string;
  brandName: string;
  brandCategory: string;
  brandStatus: string;
};

type Tab = "all" | "active" | "suspended";
type SortKey = "name" | "brand" | "joinedAt";
type SortDir = "asc" | "desc";

const JOINED_FILTERS = [
  { value: "all", label: "All time" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
] as const;

const PAGE_SIZE = 10;

export function BrandAdminsTable({
  rows,
  stats,
}: {
  rows: BrandAdminRow[];
  stats: { total: number; active: number; suspended: number };
}) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [joinedFilter, setJoinedFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("joinedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let result = rows;

    if (tab !== "all") {
      result = result.filter((r) => r.status === tab);
    }

    if (joinedFilter !== "all") {
      const days = Number(joinedFilter);
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      result = result.filter((r) => new Date(r.joinedAt).getTime() >= cutoff);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          r.brandName.toLowerCase().includes(q)
      );
    }

    return [...result].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "brand") cmp = a.brandName.localeCompare(b.brandName);
      else cmp = new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rows, tab, joinedFilter, search, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  }

  function setTabAndReset(t: Tab) {
    setTab(t);
    setPage(1);
  }

  const sortIndicator = (key: SortKey) => (sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : "");

  return (
    <div>
      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard label="Total" value={stats.total} active={tab === "all"} onClick={() => setTabAndReset("all")} />
        <StatCard
          label="Active"
          value={stats.active}
          active={tab === "active"}
          onClick={() => setTabAndReset("active")}
          accent="green"
        />
        <StatCard
          label="Suspended"
          value={stats.suspended}
          active={tab === "suspended"}
          onClick={() => setTabAndReset("suspended")}
          accent="red"
        />
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by name, email, or brand…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="flex-1 min-w-[220px] text-sm border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 bg-white dark:bg-gray-950 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
        />
        <select
          value={joinedFilter}
          onChange={(e) => {
            setJoinedFilter(e.target.value);
            setPage(1);
          }}
          className="text-sm border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 bg-white dark:bg-gray-950 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
        >
          {JOINED_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              Joined: {f.label}
            </option>
          ))}
        </select>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 mb-4">
        {(["all", "active", "suspended"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTabAndReset(t)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px capitalize transition-colors ${
              tab === t
                ? "border-black dark:border-white text-black dark:text-white"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Table */}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500 dark:text-gray-400">
            <th className="pb-3 font-medium cursor-pointer select-none" onClick={() => toggleSort("name")}>
              Admin{sortIndicator("name")}
            </th>
            <th className="pb-3 font-medium cursor-pointer select-none" onClick={() => toggleSort("brand")}>
              Brand{sortIndicator("brand")}
            </th>
            <th className="pb-3 font-medium">Status</th>
            <th className="pb-3 font-medium cursor-pointer select-none" onClick={() => toggleSort("joinedAt")}>
              Joined{sortIndicator("joinedAt")}
            </th>
            <th className="pb-3" />
          </tr>
        </thead>
        <tbody className="divide-y">
          {pageRows.map((r) => (
            <Row key={`${r.userId}-${r.brandId}`} row={r} />
          ))}
          {pageRows.length === 0 && (
            <tr>
              <td colSpan={5} className="py-8 text-center text-gray-400 dark:text-gray-500 text-sm">
                No brand admins found.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4 text-sm text-gray-500 dark:text-gray-400">
        <span>
          {filtered.length === 0
            ? "0 results"
            : `Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(
                currentPage * PAGE_SIZE,
                filtered.length
              )} of ${filtered.length}`}
        </span>
        <div className="flex items-center gap-2">
          <button
            disabled={currentPage <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="border border-gray-200 dark:border-gray-700 rounded-md px-3 py-1 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800/60"
          >
            Previous
          </button>
          <span className="px-2 py-1 tabular-nums">
            {currentPage} / {pageCount}
          </span>
          <button
            disabled={currentPage >= pageCount}
            onClick={() => setPage((p) => p + 1)}
            className="border border-gray-200 dark:border-gray-700 rounded-md px-3 py-1 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800/60"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  active,
  onClick,
  accent,
}: {
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
  accent?: "green" | "red";
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left border rounded-lg p-4 transition-colors ${
        active
          ? "border-black dark:border-white bg-gray-50 dark:bg-gray-800/60"
          : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60"
      }`}
    >
      <div
        className={`text-2xl font-semibold ${
          accent === "green"
            ? "text-green-700 dark:text-green-400"
            : accent === "red"
              ? "text-red-700 dark:text-red-400"
              : ""
        }`}
      >
        {value}
      </div>
      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{label}</div>
    </button>
  );
}

function StatusBadge({ status }: { status: "active" | "suspended" }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
        status === "active"
          ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400"
          : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
      }`}
    >
      {status}
    </span>
  );
}

function Row({ row }: { row: BrandAdminRow }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
        <td className="py-3">
          <div className="font-medium">{row.name}</div>
          <div className="text-xs text-gray-400 dark:text-gray-500">{row.email}</div>
        </td>
        <td className="py-3 text-gray-600 dark:text-gray-400">{row.brandName}</td>
        <td className="py-3">
          <StatusBadge status={row.status} />
        </td>
        <td className="py-3 text-gray-500 dark:text-gray-400 text-xs">
          {new Date(row.joinedAt).toLocaleDateString()}
        </td>
        <td className="py-3 text-right">
          <RowActions row={row} expanded={expanded} onToggleDetails={() => setExpanded((e) => !e)} />
        </td>
      </tr>

      {expanded && (
        <tr className="bg-gray-50 dark:bg-gray-900/60">
          <td colSpan={5} className="px-3 py-3 text-xs text-gray-600 dark:text-gray-400">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-gray-400 dark:text-gray-500">Brand category:</span>{" "}
                <span className="capitalize">{row.brandCategory}</span>
              </div>
              <div>
                <span className="text-gray-400 dark:text-gray-500">Brand status:</span>{" "}
                <span className="capitalize">{row.brandStatus}</span>
              </div>
              <div className="col-span-2 truncate">
                <span className="text-gray-400 dark:text-gray-500">User ID:</span> {row.userId}
              </div>
              <div className="col-span-2">
                <span className="text-gray-400 dark:text-gray-500">Joined:</span>{" "}
                {new Date(row.joinedAt).toLocaleString()}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
