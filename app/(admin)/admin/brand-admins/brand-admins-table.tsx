"use client";

import { useMemo, useState } from "react";
import { RowActions } from "./row-actions";
import { StatCard, StatCardGrid } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { Tabs } from "@/components/admin/tabs";
import { Pagination } from "@/components/admin/pagination";
import { SearchInput, FilterSelect } from "@/components/admin/search-input";
import { SortableHeader, type SortDir } from "@/components/admin/sortable-header";

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

const JOINED_FILTERS = [
  { value: "all", label: "Joined: All time" },
  { value: "7", label: "Joined: Last 7 days" },
  { value: "30", label: "Joined: Last 30 days" },
  { value: "90", label: "Joined: Last 90 days" },
];

const TABS: { value: Tab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
];

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

  return (
    <div>
      <StatCardGrid cols={3}>
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
      </StatCardGrid>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <SearchInput
          placeholder="Search by name, email, or brand…"
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
        />
        <FilterSelect
          value={joinedFilter}
          onChange={(v) => {
            setJoinedFilter(v);
            setPage(1);
          }}
          options={JOINED_FILTERS}
        />
      </div>

      <Tabs tabs={TABS} value={tab} onChange={setTabAndReset} />

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500 dark:text-gray-400">
            <SortableHeader label="Admin" sortKey="name" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
            <SortableHeader label="Brand" sortKey="brand" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
            <th className="pb-3 font-medium">Status</th>
            <SortableHeader label="Joined" sortKey="joinedAt" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
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

      <Pagination page={currentPage} pageCount={pageCount} totalCount={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
    </div>
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
