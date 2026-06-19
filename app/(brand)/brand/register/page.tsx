"use client";

import { useState } from "react";
import Link from "next/link";

const CATEGORIES = ["casual", "business", "formal", "custom"] as const;

const STEPS = [
  {
    number: "01",
    title: "Apply",
    description: "Tell us about your brand — takes under 2 minutes.",
  },
  {
    number: "02",
    title: "Review",
    description: "Our team reviews every application within 2–5 business days.",
  },
  {
    number: "03",
    title: "Go live",
    description: "Once approved, upload your catalog and start connecting with clients.",
  },
];

const inputClass =
  "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600";

const labelClass = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5";

export default function BrandRegisterPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const body = {
      name: form.get("name"),
      category: form.get("category"),
      adminEmail: form.get("adminEmail"),
      fulfillmentEmail: form.get("fulfillmentEmail"),
    };

    const res = await fetch("/api/brand/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong. Please try again.");
      setLoading(false);
      return;
    }

    setSubmitted(true);
    setLoading(false);
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center px-5">
        <div className="max-w-md w-full text-center">
          <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-700 dark:text-green-400">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold mb-3">Application submitted</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
            We&apos;ve received your application and sent a confirmation to your admin email.
            Our team reviews every application within 2–5 business days — you&apos;ll hear from us soon.
          </p>
          <Link
            href="/login"
            className="inline-block mt-8 text-sm text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white underline underline-offset-2"
          >
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Header */}
      <header className="border-b border-black/6 dark:border-white/8 px-6 py-4 flex items-center justify-between">
        <Link href="/login" className="text-xl font-semibold tracking-tight">StyleDeck</Link>
        <Link
          href="/login"
          className="text-sm text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white"
        >
          Already have an account? Sign in →
        </Link>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-14 grid grid-cols-1 lg:grid-cols-2 gap-16">
        {/* Left: value prop */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">
            For brands
          </p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight mb-5">
            Reach clients who matter.
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-base leading-relaxed mb-10">
            StyleDeck is a private platform connecting curated fashion brands with a selected network
            of actors, athletes, influencers, and performers. Every client is verified. Every interaction is intentional.
          </p>

          {/* Process steps */}
          <div className="space-y-6">
            {STEPS.map((step) => (
              <div key={step.number} className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{step.number}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold mb-0.5">{step.title}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: form */}
        <div>
          <div className="border border-black/8 dark:border-white/10 rounded-2xl p-8">
            <h2 className="text-lg font-semibold mb-1">Brand application</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-7">
              Applications are reviewed by our team — we&apos;ll be in touch within 2–5 business days.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className={labelClass}>Brand name</label>
                <input
                  name="name"
                  required
                  minLength={2}
                  maxLength={100}
                  className={inputClass}
                  placeholder="e.g. Maison Laurent"
                />
              </div>

              <div>
                <label className={labelClass}>Category</label>
                <select name="category" required className={inputClass}>
                  <option value="">Select a category…</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Admin email</label>
                <input
                  name="adminEmail"
                  type="email"
                  required
                  className={inputClass}
                  placeholder="you@yourbrand.com"
                />
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                  This will be your login email once approved.
                </p>
              </div>

              <div>
                <label className={labelClass}>Fulfillment email</label>
                <input
                  name="fulfillmentEmail"
                  type="email"
                  required
                  className={inputClass}
                  placeholder="orders@yourbrand.com"
                />
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                  Order notifications will be sent here. Can be the same as your admin email.
                </p>
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/40 rounded-lg px-4 py-3">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-black dark:bg-white dark:text-black text-white rounded-xl px-4 py-3 text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                {loading ? "Submitting…" : "Submit application"}
              </button>

              <p className="text-xs text-center text-gray-400 dark:text-gray-500">
                By applying you agree to StyleDeck&apos;s terms of service and brand guidelines.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
