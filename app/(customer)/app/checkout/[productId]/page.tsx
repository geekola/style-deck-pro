"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function PurchaseCheckoutPage() {
  const { productId } = useParams<{ productId: string }>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
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
      body: JSON.stringify({ orderType: "purchase", productId, shippingAddress }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong.");
      setLoading(false);
      return;
    }

    const { checkoutUrl } = await res.json();
    window.location.href = checkoutUrl;
  }

  return (
    <div className="min-h-screen bg-white max-w-lg mx-auto px-5 py-8">
      <Link href="/app/saved" className="text-sm text-gray-400 hover:text-black">← Back</Link>

      <div className="mt-6 mb-8">
        <h1 className="text-2xl font-semibold">Shipping address</h1>
        <p className="text-gray-500 text-sm mt-2">
          You&apos;ll complete payment securely via Stripe.
        </p>
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
            <input name="country" required className={inputClass} placeholder="US" maxLength={2} />
          </Field>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white text-sm font-medium py-3 rounded-xl hover:bg-gray-800 disabled:opacity-50 mt-2"
        >
          {loading ? "Redirecting to payment…" : "Continue to payment →"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black";
