"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RowActions } from "./row-actions";
import { StatCard, StatCardGrid } from "@/components/admin/stat-card";
import { Tabs } from "@/components/admin/tabs";
import { Pagination } from "@/components/admin/pagination";
import { SearchInput, FilterSelect } from "@/components/admin/search-input";
import { SortableHeader, type SortDir } from "@/components/admin/sortable-header";

export type ProductRow = {
  id: string;
  name: string;
  category: string;
  itemType: "gift" | "purchase";
  description: string | null;
  price: number | null;
  costPrice: number | null;
  returnPolicy: string | null;
  visibility: "draft" | "hidden" | "live";
  createdAt: string;
  thumbnailUrl: string | null;
};

type Tab = "all" | "live" | "draft" | "hidden";
type SortKey = "name" | "category" | "price" | "createdAt";

const TABS: { value: Tab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "live", label: "Live" },
  { value: "draft", label: "Draft" },
  { value: "hidden", label: "Hidden" },
];

const CATEGORY_FILTERS = [
  { value: "all", label: "Category: All" },
  { value: "casual", label: "Category: Casual" },
  { value: "business", label: "Category: Business" },
  { value: "formal", label: "Category: Formal" },
  { value: "custom", label: "Category: Custom" },
];

const TYPE_FILTERS = [
  { value: "all", label: "Type: All" },
  { value: "gift", label: "Type: Gift" },
  { value: "purchase", label: "Type: Purchase" },
];

const PAGE_SIZE = 10;

const VISIBILITY_BADGE: Record<ProductRow["visibility"], { label: string; class: string }> = {
  live: {
    label: "Live",
    class: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400",
  },
  draft: {
    label: "Draft",
    class: "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400",
  },
  hidden: {
    label: "Hidden",
    class: "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400",
  },
};

export function ProductsTable({
  rows,
  stats,
}: {
  rows: ProductRow[];
  stats: { total: number; live: number; draft: number; hidden: number };
}) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let result = rows;

    if (tab !== "all") {
      result = result.filter((r) => r.visibility === tab);
    }

    if (categoryFilter !== "all") {
      result = result.filter((r) => r.category === categoryFilter);
    }

    if (typeFilter !== "all") {
      result = result.filter((r) => r.itemType === typeFilter);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((r) => r.name.toLowerCase().includes(q));
    }

    return [...result].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "category") cmp = a.category.localeCompare(b.category);
      else if (sortKey === "price") cmp = (a.price ?? 0) - (b.price ?? 0);
      else cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rows, tab, categoryFilter, typeFilter, search, sortKey, sortDir]);

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
      <StatCardGrid cols={4}>
        <StatCard label="Total" value={stats.total} active={tab === "all"} onClick={() => setTabAndReset("all")} />
        <StatCard label="Live" value={stats.live} active={tab === "live"} onClick={() => setTabAndReset("live")} accent="green" />
        <StatCard label="Draft" value={stats.draft} active={tab === "draft"} onClick={() => setTabAndReset("draft")} />
        <StatCard label="Hidden" value={stats.hidden} active={tab === "hidden"} onClick={() => setTabAndReset("hidden")} accent="amber" />
      </StatCardGrid>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <SearchInput
          placeholder="Search by name..."
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
        />
        <FilterSelect
          value={categoryFilter}
          onChange={(v) => { setCategoryFilter(v); setPage(1); }}
          options={CATEGORY_FILTERS}
        />
        <FilterSelect
          value={typeFilter}
          onChange={(v) => { setTypeFilter(v); setPage(1); }}
          options={TYPE_FILTERS}
        />
      </div>

      <Tabs tabs={TABS} value={tab} onChange={setTabAndReset} />

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500 dark:text-gray-400">
            <SortableHeader label="Name" sortKey="name" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
            <SortableHeader label="Category" sortKey="category" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
            <th className="pb-3 font-medium">Type</th>
            <SortableHeader label="Price" sortKey="price" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
            <th className="pb-3 font-medium">Visibility</th>
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
              <td colSpan={7} className="py-8 text-center text-gray-400 dark:text-gray-500 text-sm">
                No catalog items found.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <Pagination
        page={currentPage}
        pageCount={pageCount}
        totalCount={filtered.length}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />
    </div>
  );
}

function Row({ row }: { row: ProductRow }) {
  const router = useRouter();
  const badge = VISIBILITY_BADGE[row.visibility];

  return (
    <tr
      className="hover:bg-gray-50 dark:hover:bg-gray-800/60 cursor-pointer"
      onClick={() => router.push(`/brand/products/${row.id}`)}
    >
      <td className="py-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
            {row.thumbnailUrl ? (
              /* Plain img avoids next/image domain-whitelist requirement for thumbnails */
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={row.thumbnailUrl}
                alt={row.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600 text-xs">
                --
              </div>
            )}
          </div>
          <span className="font-medium">{row.name}</span>
        </div>
      </td>
      <td className="py-3 capitalize text-gray-600 dark:text-gray-400">{row.category}</td>
      <td className="py-3 capitalize text-gray-600 dark:text-gray-400">{row.itemType}</td>
      <td className="py-3 text-gray-600 dark:text-gray-400">
        {row.price != null ? `$${(row.price / 100).toFixed(2)}` : "--"}
      </td>
      <td className="py-3">
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${badge.class}`}>
          {badge.label}
        </span>
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
