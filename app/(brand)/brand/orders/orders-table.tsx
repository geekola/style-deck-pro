"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RowActions } from "./row-actions";
import { StatCard, StatCardGrid } from "@/components/admin/stat-card";
import { Tabs } from "@/components/admin/tabs";
import { Pagination } from "@/components/admin/pagination";
import { SearchInput, FilterSelect } from "@/components/admin/search-input";
import { SortableHeader, type SortDir } from "@/components/admin/sortable-header";

export type ShippingAddress = {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export type OrderRow = {
  id: string;
  orderType: "purchase" | "gift";
  status: "pending" | "shipped";
  amountCents: number;
  trackingNumber: string | null;
  shippingAddress: ShippingAddress | null;
  createdAt: string;
  shippedAt: string | null;
  productName: string;
  customerName: string;
  customerEmail: string;
};

type Tab = "all" | "pending" | "shipped";
type SortKey = "product" | "customer" | "createdAt";

const TABS: { value: Tab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Needs shipping" },
  { value: "shipped", label: "Shipped" },
];

const TYPE_FILTERS = [
  { value: "all", label: "Type: All" },
  { value: "gift", label: "Type: Gift" },
  { value: "purchase", label: "Type: Purchase" },
];

const PAGE_SIZE = 10;

export function OrdersTable({
  rows,
  stats,
}: {
  rows: OrderRow[];
  stats: { total: number; pending: number; shipped: number };
}) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let result = rows;

    if (tab !== "all") {
      result = result.filter((r) => r.status === tab);
    }

    if (typeFilter !== "all") {
      result = result.filter((r) => r.orderType === typeFilter);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (r) =>
          r.productName.toLowerCase().includes(q) ||
          r.customerName.toLowerCase().includes(q) ||
          r.customerEmail.toLowerCase().includes(q)
      );
    }

    return [...result].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "product") cmp = a.productName.localeCompare(b.productName);
      else if (sortKey === "customer") cmp = a.customerName.localeCompare(b.customerName);
      else cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rows, tab, typeFilter, search, sortKey, sortDir]);

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
          label="Needs shipping"
          value={stats.pending}
          active={tab === "pending"}
          onClick={() => setTabAndReset("pending")}
          accent="amber"
        />
        <StatCard
          label="Shipped"
          value={stats.shipped}
          active={tab === "shipped"}
          onClick={() => setTabAndReset("shipped")}
          accent="green"
        />
      </StatCardGrid>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <SearchInput
          placeholder="Search by product or customer..."
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
        />
        <FilterSelect
          value={typeFilter}
          onChange={(v) => {
            setTypeFilter(v);
            setPage(1);
          }}
          options={TYPE_FILTERS}
        />
      </div>

      <Tabs tabs={TABS} value={tab} onChange={setTabAndReset} />

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500 dark:text-gray-400">
            <SortableHeader label="Product" sortKey="product" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
            <SortableHeader label="Customer" sortKey="customer" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
            <th className="pb-3 font-medium">Type</th>
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
              <td colSpan={6} className="py-8 text-center text-gray-400 dark:text-gray-500 text-sm">
                No orders found.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <Pagination page={currentPage} pageCount={pageCount} totalCount={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
    </div>
  );
}

function Row({ row }: { row: OrderRow }) {
  const router = useRouter();

  return (
    <tr
      className="hover:bg-gray-50 dark:hover:bg-gray-800/60 cursor-pointer"
      onClick={() => router.push(`/brand/orders/${row.id}`)}
    >
      <td className="py-3 font-medium">{row.productName}</td>
      <td className="py-3">
        <div>{row.customerName}</div>
        <div className="text-xs text-gray-400 dark:text-gray-500">{row.customerEmail}</div>
      </td>
      <td className="py-3">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            row.orderType === "gift"
              ? "bg-purple-100 text-purple-700"
              : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
          }`}
        >
          {row.orderType === "gift" ? "Gift" : `Purchase · $${(row.amountCents / 100).toFixed(2)}`}
        </span>
      </td>
      <td className="py-3">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
            row.status === "shipped"
              ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400"
              : "bg-amber-100 text-amber-700"
          }`}
        >
          {row.status === "shipped" ? "Shipped" : "Pending"}
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
