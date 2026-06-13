"use client";

import { useMemo, useState } from "react";
import { RowActions } from "./row-actions";
import { StatCard, StatCardGrid } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { Tabs } from "@/components/admin/tabs";
import { Pagination } from "@/components/admin/pagination";
import { SearchInput, FilterSelect } from "@/components/admin/search-input";
import { SortableHeader, type SortDir } from "@/components/admin/sortable-header";

export type UserTableRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  customerType: string | null;
  customerIndustry: string | null;
  customerStatus: "active" | "suspended" | null;
  joinedAt: string;
};

type Tab = "all" | "customer" | "brand_admin" | "platform_admin";
type SortKey = "name" | "role" | "joinedAt";

const TABS: { value: Tab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "customer", label: "Customers" },
  { value: "brand_admin", label: "Brand Admins" },
  { value: "platform_admin", label: "Platform Admins" },
];

const STATUS_FILTERS = [
  { value: "all", label: "Status: All" },
  { value: "active", label: "Status: Active" },
  { value: "suspended", label: "Status: Suspended" },
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
  stats: { total: number; customers: number; brandAdmins: number; suspended: number };
}) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [joinedFilter, setJoinedFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("joinedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let result = rows;

    if (tab !== "all") {
      result = result.filter((r) => r.role === tab);
    }

    if (statusFilter !== "all") {
      result = result.filter((r) => r.customerStatus === statusFilter);
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
      else if (sortKey === "role") cmp = a.role.localeCompare(b.role);
      else cmp = new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rows, tab, statusFilter, joinedFilter, search, sortKey, sortDir]);

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
        <StatCard
          label="Customers"
          value={stats.customers}
          active={tab === "customer"}
          onClick={() => setTabAndReset("customer")}
        />
        <StatCard
          label="Brand Admins"
          value={stats.brandAdmins}
          active={tab === "brand_admin"}
          onClick={() => setTabAndReset("brand_admin")}
        />
        <StatCard label="Suspended" value={stats.suspended} accent="red" />
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
          value={statusFilter}
          onChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
          options={STATUS_FILTERS}
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
            <SortableHeader label="Name" sortKey="name" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
            <SortableHeader label="Role" sortKey="role" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
            <th className="pb-3 font-medium">Type</th>
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
                No users found.
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
    if (!expanded && row.role === "customer" && contacts === null) {
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
      <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
        <td className="py-3">
          <div className="font-medium">{row.name}</div>
          <div className="text-xs text-gray-400 dark:text-gray-500">{row.email}</div>
        </td>
        <td className="py-3 capitalize text-gray-600 dark:text-gray-400">{row.role.replace("_", " ")}</td>
        <td className="py-3 capitalize text-gray-600 dark:text-gray-400">{row.customerType ?? "—"}</td>
        <td className="py-3">
          {row.customerStatus ? (
            <StatusBadge status={row.customerStatus} />
          ) : (
            <span className="text-gray-400 dark:text-gray-500 text-xs">—</span>
          )}
        </td>
        <td className="py-3 text-gray-500 dark:text-gray-400 text-xs">
          {new Date(row.joinedAt).toLocaleDateString()}
        </td>
        <td className="py-3 text-right">
          <RowActions row={row} expanded={expanded} onToggleDetails={toggleDetails} />
        </td>
      </tr>

      {expanded && (
        <tr className="bg-gray-50 dark:bg-gray-900/60">
          <td colSpan={6} className="px-3 py-3 text-xs text-gray-600 dark:text-gray-400">
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <span className="text-gray-400 dark:text-gray-500">Industry:</span>{" "}
                <span className="capitalize">{row.customerIndustry ?? "—"}</span>
              </div>
              <div className="truncate">
                <span className="text-gray-400 dark:text-gray-500">User ID:</span> {row.id}
              </div>
              <div className="col-span-2">
                <span className="text-gray-400 dark:text-gray-500">Joined:</span>{" "}
                {new Date(row.joinedAt).toLocaleString()}
              </div>
            </div>

            {row.role === "customer" && (
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
                        {c.role && <span className="text-gray-400"> &middot; {c.role}</span>}
                        {(c.email || c.phone) && (
                          <span> &mdash; {[c.email, c.phone].filter(Boolean).join(" · ")}</span>
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
            )}
          </td>
        </tr>
      )}
    </>
  );
}
