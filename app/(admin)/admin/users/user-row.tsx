"use client";

import { useState } from "react";
import { UserActions } from "./user-actions";

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

export type UserRowData = {
  id: string;
  name: string;
  email: string;
  role: string;
  customerType: string | null;
  customerIndustry: string | null;
  customerStatus: "active" | "suspended" | null;
  joinedDate: string;
};

export function UserRow({ user }: { user: UserRowData }) {
  const [expanded, setExpanded] = useState(false);
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function toggleContacts() {
    if (!expanded && contacts === null) {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/users/${user.id}/contacts`);
        setContacts(res.ok ? await res.json() : []);
      } catch {
        setContacts([]);
      }
      setLoading(false);
    }
    setExpanded((e) => !e);
  }

  return (
    <>
      <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/60 dark:bg-gray-900">
        <td className="py-3">
          <div className="font-medium">{user.name}</div>
          <div className="text-xs text-gray-400 dark:text-gray-500">{user.email}</div>
        </td>
        <td className="py-3 capitalize text-gray-600 dark:text-gray-400 dark:text-gray-500">
          {user.role.replace("_", " ")}
        </td>
        <td className="py-3 capitalize text-gray-600 dark:text-gray-400 dark:text-gray-500">
          {user.customerType ?? "—"}
        </td>
        <td className="py-3">
          {user.customerStatus ? (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                user.customerStatus === "active"
                  ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400"
                  : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
              }`}
            >
              {user.customerStatus}
            </span>
          ) : (
            <span className="text-gray-400 dark:text-gray-500 text-xs">—</span>
          )}
        </td>
        <td className="py-3 text-gray-500 dark:text-gray-400 dark:text-gray-500 text-xs">
          {user.joinedDate}
        </td>
        <td className="py-3 text-right">
          <div className="flex items-center justify-end gap-3">
            {user.role === "customer" && (
              <button
                onClick={toggleContacts}
                className="text-xs text-gray-500 hover:text-black dark:hover:text-white"
              >
                {expanded ? "Hide contacts" : "Contacts"}
              </button>
            )}
            {user.role === "customer" && user.customerStatus && (
              <UserActions
                userId={user.id}
                currentStatus={user.customerStatus}
                profile={{
                  name: user.name,
                  email: user.email,
                  customerType: user.customerType ?? "performer",
                  customerIndustry: user.customerIndustry ?? "other",
                }}
              />
            )}
          </div>
        </td>
      </tr>

      {expanded && (
        <tr className="bg-gray-50 dark:bg-gray-900/60">
          <td colSpan={6} className="px-3 py-3">
            {loading ? (
              <p className="text-xs text-gray-400">Loading contacts...</p>
            ) : contacts && contacts.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold">
                  Additional contacts
                </p>
                {contacts.map((c) => (
                  <div key={c.id} className="text-xs text-gray-600 dark:text-gray-400">
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
              <p className="text-xs text-gray-400">No additional contacts.</p>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
