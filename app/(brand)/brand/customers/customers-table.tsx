"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { StatCard, StatCardGrid } from "@/components/admin/stat-card";
import { Tabs } from "@/components/admin/tabs";
import { Pagination } from "@/components/admin/pagination";
import { SearchInput, FilterSelect } from "@/components/admin/search-input";
import { SortableHeader, type SortDir } from "@/components/admin/sortable-header";
import { ActionsMenu, type RowAction } from "@/components/admin/actions-menu";

export type CustomerRow = {
  id: string;
  name: string;
  email: string;
  type: string;
  industry: string;
  hasAccess: boolean;
};

type Tab = "all" | "access" | "no-access";
type SortKey = "name" | "type" | "industry";

const TABS: { value: Tab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "access", label: "Granted" },
  { value: "no-access", label: "No access" },
];

const TYPE_FILTERS = [
  { value: "all", label: "Type: All" },
  { value: "actor", label: "Type: Actor" },
  { value: "athlete", label: "Type: Athlete" },
  { value: "influencer", label: "Type: Influencer" },
  { value: "performer", label: "Type: Performer" },
];

const INDUSTRY_FILTERS = [
  { value: "all", label: "Industry: All" },
  { value: "film", label: "Industry: Film" },
  { value: "music", label: "Industry: Music" },
  { value: "sports", label: "Industry: Sports" },
  { value: "fashion", label: "Industry: Fashion" },
  { value: "business", label: "Industry: Business" },
  { value: "media", label: "Industry: Media" },
  { value: "technology", label: "Industry: Technology" },
  { value: "other", label: "Industry: Other" },
];

const PAGE_SIZE = 10;

export function CustomersTable({
  rows,
  stats,
  accessPolicy,
  onToggleAccess,
}: {
  rows: CustomerRow[];
  stats: { total: number; withAccess: number; noAccess: number };
  accessPolicy: "open" | "selective" | "invite_only";
  onToggleAccess: (customerId: string, grant: boolean) => void;
}) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let result = rows;

    if (tab !== "all") {
      result = result.filter((r) => (tab === "access" ? r.hasAccess : !r.hasAccess));
    }

    if (typeFilter !== "all") {
      result = result.filter((r) => r.type === typeFilter);
    }

    if (industryFilter !== "all") {
      result = result.filter((r) => r.industry === industryFilter);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (r) => r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q)
      );
    }

    return [...result].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "type") cmp = a.type.localeCompare(b.type);
      else cmp = a.industry.localeCompare(b.industry);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rows, tab, typeFilter, industryFilter, search, sortKey, sortDir]);

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

  const isOpen = accessPolicy === "open";

  if (rows.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400 dark:text-gray-500">
        {accessPolicy === "invite_only"
          ? "No clients yet. Send an invite to get started."
          : accessPolicy === "selective"
          ? "No clients yet. Grant access to customers to get started."
          : "No clients registered yet."}
      </div>
    );
  }

  return (
    <div>
      {isOpen && (
        <div className="mb-6 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 px-4 py-3 text-sm text-blue-800 dark:text-blue-300">
          Your policy is <strong>Open</strong> — all registered customers can discover your products. Individual access grants are stored but have no effect on discovery while this policy is active.
        </div>
      )}

      <StatCardGrid cols={3}>
        <StatCard label="Total" value={stats.total} active={tab === "all"} onClick={() => setTabAndReset("all")} />
        <StatCard
          label="Granted access"
          value={stats.withAccess}
          active={tab === "access"}
          onClick={() => setTabAndReset("access")}
          accent="green"
        />
        <StatCard
          label="No access"
          value={stats.noAccess}
          active={tab === "no-access"}
          onClick={() => setTabAndReset("no-access")}
        />
      </StatCardGrid>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <SearchInput
          placeholder="Search by name or email..."
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
        <FilterSelect
          value={industryFilter}
          onChange={(v) => {
            setIndustryFilter(v);
            setPage(1);
          }}
          options={INDUSTRY_FILTERS}
        />
      </div>

      <Tabs tabs={TABS} value={tab} onChange={setTabAndReset} />

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500 dark:text-gray-400">
            <SortableHeader label="Name" sortKey="name" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
            <SortableHeader label="Type" sortKey="type" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
            <SortableHeader label="Industry" sortKey="industry" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
            <th className="pb-3 font-medium">Access</th>
            <th className="pb-3" />
          </tr>
        </thead>
        <tbody className="divide-y">
          {pageRows.map((r) => (
            <Row key={r.id} row={r} accessPolicy={accessPolicy} onToggleAccess={onToggleAccess} />
          ))}
          {pageRows.length === 0 && (
            <tr>
              <td colSpan={5} className="py-8 text-center text-gray-400 dark:text-gray-500 text-sm">
                No clients found.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <Pagination page={currentPage} pageCount={pageCount} totalCount={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
    </div>
  );
}

function Row({
  row,
  accessPolicy,
  onToggleAccess,
}: {
  row: CustomerRow;
  accessPolicy: "open" | "selective" | "invite_only";
  onToggleAccess: (customerId: string, grant: boolean) => void;
}) {
  const router = useRouter();

  const actions: RowAction[] = [
    {
      key: "toggle-access",
      label: row.hasAccess ? "Revoke access" : "Grant access",
      onClick: () => onToggleAccess(row.id, !row.hasAccess),
      variant: row.hasAccess ? "danger" : "default",
    },
  ];

  return (
    <tr
      className="hover:bg-gray-50 dark:hover:bg-gray-800/60 cursor-pointer"
      onClick={() => router.push(`/brand/customers/${row.id}`)}
    >
      <td className="py-3">
        <div className="font-medium">{row.name}</div>
        <div className="text-xs text-gray-400 dark:text-gray-500">{row.email}</div>
      </td>
      <td className="py-3 capitalize text-gray-600 dark:text-gray-400">{row.type}</td>
      <td className="py-3 capitalize text-gray-600 dark:text-gray-400">{row.industry}</td>
      <td className="py-3">
        {accessPolicy === "open" ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
            Open access
          </span>
        ) : (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
              row.hasAccess
                ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400"
                : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
            }`}
          >
            {row.hasAccess ? "Granted" : "No access"}
          </span>
        )}
      </td>
      <td className="py-3 text-right" onClick={(e) => e.stopPropagation()}>
        <ActionsMenu actions={actions} />
      </td>
    </tr>
  );
}
