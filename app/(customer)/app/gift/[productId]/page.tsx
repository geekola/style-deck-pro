"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { CountrySelect } from "@/components/country-select";

type Product = {
  id: string;
  name: string;
  category: string;
  itemType: "gift" | "purchase";
  description: string | null;
  brandName: string;
  brandLogoUrl: string | null;
  heroImage: string | null;
};

type Address = {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export default function GiftCheckoutPage() {
  const { productId } = useParams<{ productId: string }>();
  const router = useRouter();

  const [product, setProduct] = useState<Product | null>(null);
  const [productError, setProductError] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form state
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("US");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/customer/products/${productId}`).then((r) =>
        r.ok ? r.json() : null
      ),
      fetch("/api/account/ship-to-address").then((r) =>
        r.ok ? r.json() : null
      ),
    ]).then(([prod, addr]: [Product | null, Address | null]) => {
      if (!prod) {
        setProductError(true);
      } else {
        setProduct(prod);
      }
      if (addr?.line1) {
        setLine1(addr.line1);
        setLine2(addr.line2 ?? "");
        setCity(addr.city);
        setState(addr.state);
        setPostalCode(addr.postalCode);
        setCountry(addr.country ?? "US");
      }
      setLoading(false);
    }).catch(() => {
      setProductError(true);
      setLoading(false);
    });
  }, [productId]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const shippingAddress: Address = {
      line1,
      ...(line2 ? { line2 } : {}),
      city,
      state,
      postalCode,
      country,
    };

    const res = await fetch("/api/customer/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderType: "gift", productId, shippingAddress }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong.");
      setSubmitting(false);
      return;
    }

    router.push("/app/orders?gifted=1");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center text-gray-400 text-sm">
        Loading…
      </div>
    );
  }

  if (productError || !product) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 max-w-lg mx-auto px-5 py-8">
        <Link href="/app/saved" className={backClass}>← Back</Link>
        <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
          This item is no longer available.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 max-w-lg mx-auto px-5 py-8">
      <Link href="/app/saved" className={backClass}>← Back</Link>

      {/* Product summary card */}
      <div className="mt-6 mb-8 flex gap-4 rounded-xl border border-black/8 dark:border-white/10 overflow-hidden">
        {product.heroImage ? (
          <img
            src={product.heroImage}
            alt={product.name}
            className="w-24 h-24 object-cover shrink-0"
          />
        ) : (
          <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-3xl opacity-20 shrink-0">
            ✦
          </div>
        )}
        <div className="py-3 pr-4 flex flex-col justify-center min-w-0">
          <span className="inline-block text-xs font-semibold uppercase tracking-widest bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded-full px-2.5 py-0.5 mb-1.5 self-start">
            Gift
          </span>
          <p className="font-semibold text-sm leading-snug truncate">{product.name}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{product.brandName}</p>
        </div>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Confirm shipping address</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
          Where should we ship your gift?
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Address line 1">
          <input
            name="line1"
            required
            value={line1}
            onChange={(e) => setLine1(e.target.value)}
            className={inputClass}
            placeholder="123 Main St"
          />
        </Field>
        <Field label="Address line 2 (optional)">
          <input
            name="line2"
            value={line2}
            onChange={(e) => setLine2(e.target.value)}
            className={inputClass}
            placeholder="Apt, suite, etc."
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="City">
            <input
              name="city"
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="State / Province">
            <input
              name="state"
              required
              value={state}
              onChange={(e) => setState(e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Postal code">
            <input
              name="postalCode"
              required
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Country">
            <CountrySelect
              name="country"
              required
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/40 rounded-lg px-4 py-3">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-black dark:bg-white dark:text-black text-white text-sm font-medium py-3 rounded-xl hover:bg-gray-800 disabled:opacity-50 mt-2"
        >
          {submitting ? "Confirming…" : "Confirm gift request"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

const backClass =
  "text-sm text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white";

const inputClass =
  "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white bg-white dark:bg-gray-900 text-gray-900 dark:text-white";
