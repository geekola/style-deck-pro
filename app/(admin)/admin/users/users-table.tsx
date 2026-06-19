"use client";

import { useMemo, useState } from "react";
import { RowActions } from "./row-actions";
import { StatCard, StatCardGrid } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { Pagination } from "@/components/admin/pagination";
import { SearchInput, FilterSelect } from "@/components/admin/search-input";
import { SortableHeader, type SortDir } from "@/components/admin/sortable-header";
import { Tabs } from "@/components/admin/tabs";

export type UserTableRow = {
  id: string;
  name: string;
  email: string;
  customerType: string | null;
  customerIndustry: string | null;
  customerStatus: "active" | "suspended" | null;
  joinedAt: string;
};

type SortKey = "name" | "joinedAt";
type StatusTab = "all" | "active" | "suspended";

const STATUS_TABS: { value: StatusTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
];

const JOINED_FILTERS = [
  { value: "all", label: "Joined: All time" },
  { value: "7", label: "Joined: Last 7 days" },
  { value: "30", label: "Joined: Last 30 days" },
  { value: "90", label: "Joined: Last 90 days" },
];

const PAGE_SIZE = 10;

export function UsersTable({
  rows,
  stats,
}: {
  rows: UserTableRow[];
  stats: { total: number; active: number; suspended: number; brandAdmins: number };
}) {
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [joinedFilter, setJoinedFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("joinedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let result = rows;

    if (statusTab !== "all") {
      result = result.filter((r) => r.customerStatus === statusTab);
    }

    if (joinedFilter !== "all") {
      const days = Number(joinedFilter);
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      result = result.filter((r) => new Date(r.joinedAt).getTime() >= cutoff);
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
      else cmp = new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rows, statusTab, joinedFilter, search, sortKey, sortDir]);

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

  return (
    <div>
      <StatCardGrid cols={4}>
        <StatCard
          label="Total clients"
          value={stats.total}
          active={statusTab === "all"}
          onClick={() => { setStatusTab("all"); setPage(1); }}
        />
        <StatCard
          label="Active"
          value={stats.active}
          accent="green"
          active={statusTab === "active"}
          onClick={() => { setStatusTab("active"); setPage(1); }}
        />
        <StatCard
          label="Suspended"
          value={stats.suspended}
          accent="red"
          active={statusTab === "suspended"}
          onClick={() => { setStatusTab("suspended"); setPage(1); }}
        />
        <StatCard label="Brand admins" value={stats.brandAdmins} />
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
          value={joinedFilter}
          onChange={(v) => {
            setJoinedFilter(v);
            setPage(1);
          }}
          options={JOINED_FILTERS}
        />
      </div>

      <Tabs
        tabs={STATUS_TABS}
        value={statusTab}
        onChange={(v) => { setStatusTab(v); setPage(1); }}
      />

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500 dark:text-gray-400">
            <SortableHeader label="Name" sortKey="name" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
            <th className="pb-3 font-medium">Type</th>
            <th className="pb-3 font-medium">Industry</th>
            <th className="pb-3 font-medium">Status</th>
            <SortableHeader label="Joined" sortKey="joinedAt" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
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

type Contact = {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
};

function Row({ row }: { row: UserTableRow }) {
  const [expanded, setExpanded] = useState(false);
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [loadingContacts, setLoadingContacts] = useState(false);

  async function toggleDetails() {
    if (!expanded && contacts === null) {
      setLoadingContacts(true);
      try {
        const res = await fetch(`/api/admin/users/${row.id}/contacts`);
        setContacts(res.ok ? await res.json() : []);
      } catch {
        setContacts([]);
      }
      setLoadingContacts(false);
    }
    setExpanded((e) => !e);
  }

  return (
    <>
      <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/60 cursor-pointer" onClick={toggleDetails}>
        <td className="py-3">
          <div className="font-medium">{row.name}</div>
          <div className="text-xs text-gray-400 dark:text-gray-500">{row.email}</div>
        </td>
        <td className="py-3 capitalize text-gray-600 dark:text-gray-400">{row.customerType ?? "---"}</td>
        <td className="py-3 capitalize text-gray-600 dark:text-gray-400">{row.customerIndustry ?? "---"}</td>
        <td className="py-3">
          {row.customerStatus ? (
            <StatusBadge status={row.customerStatus} />
          ) : (
            <span className="text-gray-400 dark:text-gray-500 text-xs">---</span>
          )}
        </td>
        <td className="py-3 text-gray-500 dark:text-gray-400 text-xs">
          {new Date(row.joinedAt).toLocaleDateString()}
        </td>
        <td className="py-3 text-right" onClick={(e) => e.stopPropagation()}>
          <RowActions row={row} expanded={expanded} onToggleDetails={toggleDetails} />
        </td>
      </tr>

      {expanded && (
        <tr className="bg-gray-50 dark:bg-gray-900/60">
          <td colSpan={6} className="px-3 py-3 text-xs text-gray-600 dark:text-gray-400">
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div className="truncate">
                <span className="text-gray-400 dark:text-gray-500">User ID:</span> {row.id}
              </div>
              <div>
                <span className="text-gray-400 dark:text-gray-500">Joined:</span>{" "}
                {new Date(row.joinedAt).toLocaleString()}
              </div>
            </div>

            <div>
              <p className="uppercase tracking-widest text-gray-400 font-semibold mb-1">
                Additional contacts
              </p>
              {loadingContacts ? (
                <p className="text-gray-400">Loading contacts...</p>
              ) : contacts && contacts.length > 0 ? (
                <div className="space-y-2">
                  {contacts.map((c) => (
                    <div key={c.id}>
                      <span className="font-medium text-gray-900 dark:text-white">{c.name}</span>
                      {c.role && <span className="text-gray-400"> {c.role}</span>}
                      {(c.email || c.phone) && (
                        <span> {[c.email, c.phone].filter(Boolean).join(" / ")}</span>
                      )}
                      {(c.addressLine1 || c.city) && (
                        <div className="text-gray-400 mt-0.5">
                          {[c.addressLine1, c.addressLine2, c.city, c.state, c.postalCode, c.country]
                            .filter(Boolean)
                            .join(", ")}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">No additional contacts.</p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
