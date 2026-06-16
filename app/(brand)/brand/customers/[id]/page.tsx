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

type CustomerProfile = {
  id: string;
  name: string;
  email: string;
  type: string;
  industry: string;
  status: string;
  createdAt: string;
  measurements: Measurements | null;
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
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

  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [togglingAccess, setTogglingAccess] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`/api/brand/customers/${id}`),
      fetch("/api/brand/customers"),
    ])
      .then(async ([profileRes, listRes]) => {
        if (profileRes.status === 404) {
          if (!cancelled) setNotFound(true);
          return;
        }
        if (!profileRes.ok) throw new Error("Failed to load");
        const [profileData, listData] = await Promise.all([
          profileRes.json(),
          listRes.ok ? listRes.json() : [],
        ]);
        if (cancelled) return;
        setProfile(profileData);
        // Find this customer's access status from the list
        const found = (listData as { id: string; hasAccess: boolean }[]).find(
          (c) => c.id === id
        );
        setHasAccess(found?.hasAccess ?? null);
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
        <Link href="/brand/customers" className="text-sm underline">
          Back to clients
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-10">
        <p className="text-sm text-red-600 mb-4">{error}</p>
        <Link href="/brand/customers" className="text-sm underline">
          Back to clients
        </Link>
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
        ...(m.extended
          ? Object.entries(m.extended).map(([k, v]) => ({ label: k, value: v }))
          : []),
      ].filter((f) => f.value)
    : [];

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
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
            <a
              href={`/api/brand/customers/${id}/summary`}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-gray-300 dark:border-gray-600 text-sm px-4 py-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/60 dark:bg-gray-900"
            >
              Print summary
            </a>
          </div>
        </div>
      </div>

      {/* Profile */}
      <div className="space-y-8">
        <Section title="Profile">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Type" value={cap(profile.type)} />
            <Field label="Industry" value={cap(profile.industry)} />
            <Field label="Status" value={cap(profile.status)} />
            <Field label="Member since" value={fmtDate(profile.createdAt)} />
          </div>
        </Section>

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

        <Section title="Access">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {hasAccess
                ? "This client can discover your products."
                : "This client cannot currently discover your products."}
            </p>
            {hasAccess !== null && (
              <button
                onClick={toggleAccess}
                disabled={togglingAccess}
                className={`text-sm px-4 py-1.5 rounded-md border disabled:opacity-50 ${
                  hasAccess
                    ? "border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    : "bg-black dark:bg-white dark:text-black text-white border-transparent hover:bg-gray-800"
                }`}
              >
                {togglingAccess
                  ? "Saving..."
                  : hasAccess
                  ? "Revoke access"
                  : "Grant access"}
              </button>
            )}
          </div>
          {accessError && <p className="text-xs text-red-600 mt-2">{accessError}</p>}
        </Section>
      </div>
    </div>
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
