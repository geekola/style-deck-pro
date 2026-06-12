"use client";

import { useState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/lib/auth-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await requestPasswordReset({
      email,
      redirectTo: "/reset-password",
    });

    setLoading(false);

    if (result.error) {
      setError(result.error.message ?? "Something went wrong. Please try again.");
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950 px-4">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-2xl font-semibold mb-4">Check your email</h1>
          <p className="text-gray-600 dark:text-gray-400 dark:text-gray-500 text-sm">
            If an account exists for <strong>{email}</strong>, we&apos;ve sent a link to reset your
            password. The link expires in 1 hour.
          </p>
          <p className="text-center text-sm text-gray-400 dark:text-gray-500 mt-8">
            <Link href="/login" className="text-black dark:text-white underline underline-offset-2">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-semibold tracking-tight">StyleDeck</h1>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Reset your password</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-600 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
              placeholder="you@example.com"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black dark:bg-white dark:text-black text-white rounded-lg py-2.5 text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 dark:text-gray-500 mt-8">
          <Link href="/login" className="text-black dark:text-white underline underline-offset-2">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
