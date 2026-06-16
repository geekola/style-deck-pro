"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type ShipToAddress = {
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export default function PurchaseCheckoutPage() {
  const { productId } = useParams<{ productId: string }>();
  const [address, setAddress] = useState<ShipToAddress | null>(null);
  const [addressLoading, setAddressLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/account/ship-to-address")
      .then((r) => r.json())
      .then((data) => {
        if (data?.line1) setAddress(data);
        setAddressLoading(false);
      })
      .catch(() => setAddressLoading(false));
  }, []);

  async function handleProceed() {
    if (!address) return;
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/customer/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderType: "purchase",
        productId,
        shippingAddress: address,
      }),
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

  if (addressLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center text-gray-400 text-sm">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 max-w-lg mx-auto px-5 py-8">
      <Link
        href="/app/saved"
        className="text-sm text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white"
      >
        ← Back
      </Link>

      <div className="mt-6 mb-8">
        <h1 className="text-2xl font-semibold">Confirm &amp; pay</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
          You&apos;ll complete payment securely via Stripe.
        </p>
      </div>

      {!address ? (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-5 mb-6">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">No shipping address on file</p>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 mb-4">
            Add a default shipping address in your profile before checking out.
          </p>
          <Link
            href="/app/account"
            className="inline-block text-sm font-medium px-4 py-2 rounded-xl bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 transition-colors"
          >
            Go to Profile
          </Link>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-black/8 dark:border-white/10 p-5 mb-6">
            <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-3">
              Shipping to
            </p>
            <p className="text-sm text-gray-900 dark:text-white leading-relaxed">
              {address.line1}
              {address.line2 && <><br />{address.line2}</>}
              <br />
              {address.city}, {address.state} {address.postalCode}
              <br />
              {address.country}
            </p>
            <Link
              href="/app/account"
              className="text-xs text-gray-400 hover:text-black dark:hover:text-white mt-3 inline-block"
            >
              Change address →
            </Link>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/40 rounded-lg px-4 py-3 mb-4">
              {error}
            </p>
          )}

          <button
            onClick={handleProceed}
            disabled={submitting}
            className="w-full bg-black dark:bg-white dark:text-black text-white text-sm font-medium py-3 rounded-xl hover:bg-gray-800 disabled:opacity-50"
          >
            {submitting ? "Redirecting to payment…" : "Continue to payment →"}
          </button>
        </>
      )}
    </div>
  );
}
