"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { resetPassword } from "@/lib/auth-client";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const tokenError = searchParams.get("error");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (tokenError || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950 px-4">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-2xl font-semibold mb-4">Link expired</h1>
          <p className="text-gray-600 dark:text-gray-400 dark:text-gray-500 text-sm">
            This password reset link is invalid or has expired. Request a new one to continue.
          </p>
          <p className="text-center text-sm text-gray-400 dark:text-gray-500 mt-8">
            <Link href="/forgot-password" className="text-black dark:text-white underline underline-offset-2">
              Request a new link
            </Link>
          </p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950 px-4">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-2xl font-semibold mb-4">Password updated</h1>
          <p className="text-gray-600 dark:text-gray-400 dark:text-gray-500 text-sm">
            Your password has been reset. You can now sign in with your new password.
          </p>
          <button
            onClick={() => router.push("/login")}
            className="mt-6 w-full bg-black dark:bg-white dark:text-black text-white rounded-lg py-2.5 text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Go to sign in
          </button>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    const result = await resetPassword({
      newPassword: password,
      token: token!,
    });
    setLoading(false);

    if (result.error) {
      setError(result.error.message ?? "Something went wrong. Please try again.");
      return;
    }

    setDone(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-semibold tracking-tight">StyleDeck</h1>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Choose a new password</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-600 mb-1">New password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
              placeholder="Min. 8 characters"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-600 mb-1">Confirm password</label>
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
              placeholder="Re-enter password"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black dark:bg-white dark:text-black text-white rounded-lg py-2.5 text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {loading ? "Updating…" : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
