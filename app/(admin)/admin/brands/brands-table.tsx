"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RowActions } from "./row-actions";
import { StatCard, StatCardGrid } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { Tabs } from "@/components/admin/tabs";
import { Pagination } from "@/components/admin/pagination";
import { SearchInput, FilterSelect } from "@/components/admin/search-input";
import { SortableHeader, type SortDir } from "@/components/admin/sortable-header";

export type BrandRow = {
  id: string;
  name: string;
  category: string;
  adminEmail: string;
  fulfillmentEmail: string;
  accessPolicy: string;
  status: "pending" | "approved" | "suspended" | "rejected";
  statusReason: string | null;
  createdAt: string;
  admins: { userId: string; name: string; email: string; status: "active" | "suspended" }[];
};

type Tab = "all" | "pending" | "approved" | "suspended" | "rejected";
type SortKey = "name" | "category" | "createdAt";

const TABS: { value: Tab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "suspended", label: "Suspended" },
  { value: "rejected", label: "Rejected" },
];

const CATEGORY_FILTERS = [
  { value: "all", label: "Category: All" },
  { value: "casual", label: "Category: Casual" },
  { value: "business", label: "Category: Business" },
  { value: "formal", label: "Category: Formal" },
  { value: "custom", label: "Category: Custom" },
];

const PAGE_SIZE = 10;

export function BrandsTable({
  rows,
  stats,
}: {
  rows: BrandRow[];
  stats: { total: number; pending: number; approved: number; suspended: number; rejected: number };
}) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let result = rows;

    if (tab !== "all") {
      result = result.filter((r) => r.status === tab);
    }

    if (categoryFilter !== "all") {
      result = result.filter((r) => r.category === categoryFilter);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.adminEmail.toLowerCase().includes(q) ||
          r.fulfillmentEmail.toLowerCase().includes(q)
      );
    }

    return [...result].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "category") cmp = a.category.localeCompare(b.category);
      else cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rows, tab, categoryFilter, search, sortKey, sortDir]);

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
      <StatCardGrid cols={5}>
        <StatCard label="Total" value={stats.total} active={tab === "all"} onClick={() => setTabAndReset("all")} />
        <StatCard
          label="Pending"
          value={stats.pending}
          active={tab === "pending"}
          onClick={() => setTabAndReset("pending")}
          accent="amber"
        />
        <StatCard
          label="Approved"
          value={stats.approved}
          active={tab === "approved"}
          onClick={() => setTabAndReset("approved")}
          accent="green"
        />
        <StatCard
          label="Suspended"
          value={stats.suspended}
          active={tab === "suspended"}
          onClick={() => setTabAndReset("suspended")}
          accent="red"
        />
        <StatCard
          label="Rejected"
          value={stats.rejected}
          active={tab === "rejected"}
          onClick={() => setTabAndReset("rejected")}
        />
      </StatCardGrid>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <SearchInput
          placeholder="Search by name or email…"
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
        />
        <FilterSelect
          value={categoryFilter}
          onChange={(v) => {
            setCategoryFilter(v);
            setPage(1);
          }}
          options={CATEGORY_FILTERS}
        />
      </div>

      <Tabs tabs={TABS} value={tab} onChange={setTabAndReset} />

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500 dark:text-gray-400">
            <SortableHeader label="Brand" sortKey="name" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
            <SortableHeader label="Category" sortKey="category" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
            <th className="pb-3 font-medium">Status</th>
            <SortableHeader label="Created" sortKey="createdAt" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
            <th className="pb-3" />
          </tr>
        </thead>
        <tbody className="divide-y">
          {pageRows.map((r) => (
            <Row key={r.id} row={r} />
          ))}
          {pageRows.length === 0 && (
            <tr>
              <td colSpan={5} className="py-8 text-center text-gray-400 dark:text-gray-500 text-sm">
                No brands found.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <Pagination page={currentPage} pageCount={pageCount} totalCount={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
    </div>
  );
}

function Row({ row }: { row: BrandRow }) {
  const router = useRouter();

  return (
    <tr
      id={`brand-${row.id}`}
      className="hover:bg-gray-50 dark:hover:bg-gray-800/60 cursor-pointer"
      onClick={() => router.push(`/admin/brands/${row.id}`)}
    >
      <td className="py-3">
        <div className="font-medium">{row.name}</div>
        <div className="text-xs text-gray-400 dark:text-gray-500">{row.adminEmail}</div>
      </td>
      <td className="py-3 capitalize text-gray-600 dark:text-gray-400">{row.category}</td>
      <td className="py-3">
        <StatusBadge status={row.status} />
      </td>
      <td className="py-3 text-gray-500 dark:text-gray-400 text-xs">
        {new Date(row.createdAt).toLocaleDateString()}
      </td>
      <td className="py-3 text-right" onClick={(e) => e.stopPropagation()}>
        <RowActions row={row} />
      </td>
    </tr>
  );
}
