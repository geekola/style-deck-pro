"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CountrySelect } from "@/components/country-select";

type SavedProduct = {
  id: string;
  name: string;
  price: number | null;
  brandName: string;
  itemType: "gift" | "purchase";
  active: boolean;
};

function MultiCheckoutInner() {
  const searchParams = useSearchParams();
  const ids = (searchParams.get("ids") ?? "").split(",").filter(Boolean);

  const [items, setItems] = useState<SavedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/customer/saved")
      .then((res) => (res.ok ? res.json() : []))
      .then((all: SavedProduct[]) => {
        setItems(all.filter((i) => ids.includes(i.id)));
        setLoading(false);
      });
  }, []);

  const total = items.reduce((sum, i) => sum + (i.price ?? 0), 0);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const shippingAddress = {
      line1: form.get("line1"),
      line2: form.get("line2") || undefined,
      city: form.get("city"),
      state: form.get("state"),
      postalCode: form.get("postalCode"),
      country: form.get("country"),
    };

    const res = await fetch("/api/customer/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderType: "purchase", productIds: ids, shippingAddress }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong.");
      setSubmitting(false);
      return;
    }

    const { checkoutUrl } = await res.json();
    window.location.href = checkoutUrl;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 max-w-lg mx-auto px-5 py-8">
        <p className="text-sm text-gray-400 dark:text-gray-500">Loading…</p>
      </div>
    );
  }

  if (ids.length === 0 || items.length === 0) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 max-w-lg mx-auto px-5 py-8">
        <Link href="/app/saved" className="text-sm text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white">← Back</Link>
        <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
          We couldn&apos;t find the items you selected. They may no longer be available.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 max-w-lg mx-auto px-5 py-8">
      <Link href="/app/saved" className="text-sm text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white">← Back</Link>

      <div className="mt-6 mb-6">
        <h1 className="text-2xl font-semibold">Shipping address</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
          You&apos;ll complete payment securely via Stripe.
        </p>
      </div>

      <div className="rounded-xl border border-black/8 dark:border-white/10 p-4 mb-6">
        <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-2">
          {items.length} item{items.length > 1 ? "s" : ""} from {items[0].brandName}
        </p>
        <div className="space-y-1.5">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between text-sm">
              <span className="truncate pr-2">{item.name}</span>
              <span className="text-gray-500 dark:text-gray-400 shrink-0">
                {item.price != null ? `$${(item.price / 100).toFixed(2)}` : "—"}
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between text-sm font-medium border-t border-black/8 dark:border-white/10 mt-3 pt-3">
          <span>Total</span>
          <span>${(total / 100).toFixed(2)}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Address line 1">
          <input name="line1" required className={inputClass} placeholder="123 Main St" />
        </Field>
        <Field label="Address line 2 (optional)">
          <input name="line2" className={inputClass} placeholder="Apt, suite, etc." />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="City">
            <input name="city" required className={inputClass} />
          </Field>
          <Field label="State / Province">
            <input name="state" required className={inputClass} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Postal code">
            <input name="postalCode" required className={inputClass} />
          </Field>
          <Field label="Country">
            <CountrySelect name="country" required defaultValue="US" className={inputClass} />
          </Field>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-black dark:bg-white dark:text-black text-white text-sm font-medium py-3 rounded-xl hover:bg-gray-800 disabled:opacity-50 mt-2"
        >
          {submitting ? "Redirecting to payment…" : "Continue to payment →"}
        </button>
      </form>
    </div>
  );
}

export default function MultiCheckoutPage() {
  return (
    <Suspense>
      <MultiCheckoutInner />
    </Suspense>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white";
