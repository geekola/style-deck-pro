"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type Measurements = {
  gender: string;
  unitSystem: string;
  height: string | null;
  weight: string | null;
  shoeSize: string | null;
  shoeWidth: string | null;
  chest: string | null;
  waist: string | null;
  hips: string | null;
  neck: string | null;
  shoulderWidth: string | null;
  sleeveLength: string | null;
  inseam: string | null;
  extended: Record<string, string> | null;
  updatedAt: string;
};

type ClientProfile = {
  id: string;
  name: string;
  email: string;
  type: string;
  industry: string;
  status: string;
  createdAt: string;
  measurements: Measurements | null;
};

type GiftingAllowance = {
  id: string;
  customerId: string;
  amountCents: number;
  usedCents: number;
  periodType: "rolling" | "calendar";
  periodDays: number | null;
  periodStart: string;
  manualResetAt: string | null;
};

type OrderRow = {
  id: string;
  orderType: "purchase" | "gift";
  status: "pending" | "shipped";
  amountCents: number;
  trackingNumber: string | null;
  createdAt: string;
  shippedAt: string | null;
  productName: string;
  customerId: string;
  customerName: string;
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
}

export default function ClientProfilePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [togglingAccess, setTogglingAccess] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [allowance, setAllowance] = useState<GiftingAllowance | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [orderTypeFilter, setOrderTypeFilter] = useState<"all" | "purchase" | "gift">("all");

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`/api/brand/customers/${id}`),
      fetch("/api/brand/customers"),
      fetch("/api/brand/gifting"),
      fetch("/api/brand/orders"),
    ])
      .then(async ([profileRes, listRes, giftingRes, ordersRes]) => {
        if (profileRes.status === 404) {
          if (!cancelled) setNotFound(true);
          return;
        }
        if (!profileRes.ok) throw new Error("Failed to load");
        const [profileData, listData, giftingData, ordersData] = await Promise.all([
          profileRes.json(),
          listRes.ok ? listRes.json() : [],
          giftingRes.ok ? giftingRes.json() : [],
          ordersRes.ok ? ordersRes.json() : [],
        ]);
        if (cancelled) return;
        setProfile(profileData);
        const found = (listData as { id: string; hasAccess: boolean }[]).find((c) => c.id === id);
        setHasAccess(found?.hasAccess ?? null);
        const myAllowance = (giftingData as GiftingAllowance[]).find((a) => a.customerId === id);
        setAllowance(myAllowance ?? null);
        setOrders((ordersData as OrderRow[]).filter((o) => o.customerId === id));
      })
      .catch(() => { if (!cancelled) setError("Failed to load client profile."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  async function toggleAccess() {
    if (hasAccess === null) return;
    setTogglingAccess(true);
    setAccessError(null);
    const res = await fetch("/api/brand/access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId: id, grant: !hasAccess }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setAccessError(data.error ?? "Failed to update access.");
    } else {
      setHasAccess(!hasAccess);
    }
    setTogglingAccess(false);
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-10 text-sm text-gray-500 dark:text-gray-400">
        Loading...
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-semibold mb-4">Client not found</h1>
        <Link href="/brand/customers" className="text-sm underline">Back to clients</Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-10">
        <p className="text-sm text-red-600 mb-4">{error}</p>
        <Link href="/brand/customers" className="text-sm underline">Back to clients</Link>
      </div>
    );
  }

  const m = profile.measurements;
  const measureFields = m
    ? [
        { label: "Height", value: m.height },
        { label: "Weight", value: m.weight },
        { label: "Chest", value: m.chest },
        { label: "Waist", value: m.waist },
        { label: "Hips", value: m.hips },
        { label: "Neck", value: m.neck },
        { label: "Shoulder", value: m.shoulderWidth },
        { label: "Sleeve", value: m.sleeveLength },
        { label: "Inseam", value: m.inseam },
        { label: "Shoe size", value: m.shoeSize },
        { label: "Shoe width", value: m.shoeWidth },
        ...(m.extended ? Object.entries(m.extended).map(([k, v]) => ({ label: k, value: v })) : []),
      ].filter((f) => f.value)
    : [];

  const filteredOrders = orderTypeFilter === "all"
    ? orders
    : orders.filter((o) => o.orderType === orderTypeFilter);

  const purchaseTotal = filteredOrders
    .filter((o) => o.orderType === "purchase")
    .reduce((sum, o) => sum + o.amountCents, 0);

  const periodLabel = allowance
    ? allowance.periodType === "rolling" && allowance.periodDays
      ? `${allowance.periodDays}-day rolling`
      : allowance.periodType === "calendar"
      ? "Custom"
      : "Rolling"
    : null;

  return (
    <>
      {/* Screen view */}
      <div className="max-w-2xl mx-auto px-6 py-10 print:hidden">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/brand/customers"
            className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1 mb-3"
          >
            <span>&#8592;</span> Clients
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold">{profile.name}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{profile.email}</p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {hasAccess !== null && (
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                    hasAccess
                      ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {hasAccess ? "Access granted" : "No access"}
                </span>
              )}
              <button
                onClick={() => window.print()}
                className="border border-gray-300 dark:border-gray-600 text-sm px-4 py-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/60 dark:bg-gray-900"
              >
                Print
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Profile */}
          <Section title="Profile">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Type" value={cap(profile.type)} />
              <Field label="Industry" value={cap(profile.industry)} />
              <Field label="Status" value={cap(profile.status)} />
              <Field label="Member since" value={fmtDate(profile.createdAt)} />
            </div>
          </Section>

          {/* Measurements */}
          <Section title="Measurements">
            {m && measureFields.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {cap(m.gender)} &nbsp;·&nbsp; {cap(m.unitSystem)}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Updated {fmtDate(m.updatedAt)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                  {measureFields.map((f) => (
                    <div key={f.label} className="flex gap-2 text-sm">
                      <span className="text-gray-400 dark:text-gray-500 w-28 shrink-0">{f.label}</span>
                      <span className="text-gray-800 dark:text-gray-200">{f.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500">No measurements on file.</p>
            )}
          </Section>

          {/* Gifting allowance */}
        
          {/* Gifting allowance */}
          {allowance && (
            <Section title="Gifting allowance">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Used</span>
                  <span className="font-medium">${(allowance.usedCents / 100).toFixed(2)} of ${(allowance.amountCents / 100).toFixed(2)}</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                  <div
                    className="bg-gray-800 dark:bg-gray-200 h-2 rounded-full"
                    style={{ width: `${Math.min(100, (allowance.usedCents / allowance.amountCents) * 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
                  <span>${((allowance.amountCents - allowance.usedCents) / 100).toFixed(2)} remaining</span>
                  {periodLabel && <span>{periodLabel} period · Started {fmtDateShort(allowance.periodStart)}</span>}
                </div>
              </div>
            </Section>
          )}

          {/* Orders */}
          <Section title="Orders">
            <div className="flex gap-3 mb-4">
              {(["all", "purchase", "gift"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setOrderTypeFilter(t)}
                  className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                    orderTypeFilter === t
                      ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-transparent"
                      : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
            {filteredOrders.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">No orders.</p>
            ) : (
              <div className="space-y-2">
                {filteredOrders.map((o) => (
                  <div key={o.id} className="flex items-center justify-between text-sm py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                    <div>
                      <p className="font-medium">{o.productName}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{fmtDateShort(o.createdAt)} · <span className="capitalize">{o.orderType}</span> · <span className="capitalize">{o.status}</span></p>
                    </div>
                    {o.orderType === "purchase" && (
                      <span className="text-gray-800 dark:text-gray-200 font-medium">${(o.amountCents / 100).toFixed(2)}</span>
                    )}
                  </div>
                ))}
                {purchaseTotal > 0 && (
                  <div className="flex justify-between text-sm pt-2 font-medium">
                    <span>Purchase total</span>
                    <span>${(purchaseTotal / 100).toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}
          </Section>

          {/* Access */}
          <Section title="Access">
            {hasAccess !== null && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {hasAccess ? "Access granted" : "No access"}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {hasAccess
                      ? "This client can discover your products."
                      : "This client cannot see your products."}
                  </p>
                </div>
                <button
                  onClick={toggleAccess}
                  disabled={togglingAccess}
                  className={`text-sm px-4 py-1.5 rounded-md transition-colors disabled:opacity-50 ${
                    hasAccess
                      ? "border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                      : "bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-100"
                  }`}
                >
                  {togglingAccess ? "Saving…" : hasAccess ? "Revoke access" : "Grant access"}
                </button>
              </div>
            )}
            {accessError && <p className="text-xs text-red-600 mt-2">{accessError}</p>}
          </Section>
        </div>
      </div>

      {/* Print-only view */}
      <div className="hidden print:block p-8 text-sm text-gray-900">
        <h1 className="text-2xl font-bold mb-1">{profile.name}</h1>
        <p className="text-gray-500 mb-6">{profile.email}</p>

        <h2 className="font-semibold text-base mb-2">Profile</h2>
        <div className="grid grid-cols-4 gap-2 mb-6">
          <div><p className="text-xs text-gray-400">Type</p><p>{cap(profile.type)}</p></div>
          <div><p className="text-xs text-gray-400">Industry</p><p>{cap(profile.industry)}</p></div>
          <div><p className="text-xs text-gray-400">Status</p><p>{cap(profile.status)}</p></div>
          <div><p className="text-xs text-gray-400">Member since</p><p>{fmtDate(profile.createdAt)}</p></div>
        </div>

        {allowance && (
          <>
            <h2 className="font-semibold text-base mb-2">Gifting allowance</h2>
            <div className="grid grid-cols-3 gap-2 mb-6">
              <div><p className="text-xs text-gray-400">Allowance</p><p>${(allowance.amountCents / 100).toFixed(2)}</p></div>
              <div><p className="text-xs text-gray-400">Used</p><p>${(allowance.usedCents / 100).toFixed(2)}</p></div>
              <div><p className="text-xs text-gray-400">Remaining</p><p>${((allowance.amountCents - allowance.usedCents) / 100).toFixed(2)}</p></div>
            </div>
          </>
        )}

        {m && measureFields.length > 0 && (
          <>
            <h2 className="font-semibold text-base mb-2">Measurements</h2>
            <p className="text-xs text-gray-400 mb-2">{cap(m.gender)} · {cap(m.unitSystem)} · Updated {fmtDate(m.updatedAt)}</p>
            <div className="grid grid-cols-4 gap-2 mb-6">
              {measureFields.map((f) => (
                <div key={f.label}>
                  <p className="text-xs text-gray-400">{f.label}</p>
                  <p>{f.value}</p>
                </div>
              ))}
            </div>
          </>
        )}

        <h2 className="font-semibold text-base mb-2">Order history</h2>
        {orders.length === 0 ? (
          <p className="text-gray-400">No orders.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-400">
                <th className="pb-1 font-medium">Product</th>
                <th className="pb-1 font-medium">Date</th>
                <th className="pb-1 font-medium">Type</th>
                <th className="pb-1 font-medium">Status</th>
                <th className="pb-1 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-gray-100">
                  <td className="py-1">{o.productName}</td>
                  <td className="py-1">{fmtDateShort(o.createdAt)}</td>
                  <td className="py-1 capitalize">{o.orderType}</td>
                  <td className="py-1 capitalize">{o.status}</td>
                  <td className="py-1 text-right">{o.orderType === "purchase" ? `$${(o.amountCents / 100).toFixed(2)}` : "—"}</td>
                </tr>
              ))}
            </tbody>
            {orders.some((o) => o.orderType === "purchase") && (
              <tfoot>
                <tr className="font-semibold">
                  <td colSpan={4} className="pt-2">Total purchases</td>
                  <td className="pt-2 text-right">
                    ${(orders.filter((o) => o.orderType === "purchase").reduce((s, o) => s + o.amountCents, 0) / 100).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-base font-semibold mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm text-gray-800 dark:text-gray-200">{value}</p>
    </div>
  );
}
lack px-3 py-2 whitespace-nowrap">{fmtDateShort(o.createdAt)}</td>
                    <td className="border border-black px-3 py-2">{o.productName}</td>
                    <td className="border border-black px-3 py-2 capitalize">{o.orderType}</td>
                    <td className="border border-black px-3 py-2 capitalize">{o.status}</td>
                    <td className="border border-black px-3 py-2 text-right">
                      {o.orderType === "gift" ? "Gift" : `$${(o.amountCents / 100).toFixed(2)}`}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} className="border border-black px-3 py-2 font-semibold text-right">Purchase total</td>
                  <td className="border border-black px-3 py-2 font-semibold text-right">${(purchaseTotal / 100).toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <p className="text-[10px] text-gray-400 text-center mt-6">
          Generated by StyleDeck &middot; {new Date().toLocaleDateString()}
        </p>
      </div>
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-4">
        {title}
      </h2>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block text-xs text-gray-400 dark:text-gray-500 mb-0.5">{label}</span>
      <span className="text-sm text-gray-800 dark:text-gray-200">{value}</span>
    </div>
  );
}
