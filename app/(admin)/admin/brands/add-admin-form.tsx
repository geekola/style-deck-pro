"use client";

import { useState } from "react";

type Result = {
  email: string;
  alreadyExisted: boolean;
  alreadyLinked: boolean;
  tempPassword?: string;
};

export function AddAdminForm({ brandId }: { brandId: string }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/admin/brands/${brandId}/admins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      setResult(data);
      setEmail("");
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="brandadmin@example.com"
          className="flex-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
        />
        <button
          type="submit"
          disabled={loading || !email}
          className="text-sm bg-black dark:bg-white dark:text-black text-white px-3 py-1.5 rounded-md hover:bg-gray-800 disabled:opacity-50 shrink-0"
        >
          {loading ? "Adding…" : "Add brand admin"}
        </button>
      </form>

      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}

      {result && (
        <div className="text-xs text-gray-700 dark:text-gray-300 dark:text-gray-600 mt-2 bg-green-50 border border-green-200 rounded-md p-2">
          {result.alreadyLinked ? (
            <p>{result.email} is already a brand admin for this brand.</p>
          ) : result.alreadyExisted ? (
            <p>Added existing user <span className="font-medium">{result.email}</span> as a brand admin.</p>
          ) : (
            <>
              <p>
                Created brand admin <span className="font-medium">{result.email}</span>.
              </p>
              <p className="mt-1">
                Temporary password:{" "}
                <span className="font-mono font-medium">{result.tempPassword}</span>
              </p>
              <p className="mt-1 text-gray-400 dark:text-gray-500">
                Share this securely — it won&apos;t be shown again.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
