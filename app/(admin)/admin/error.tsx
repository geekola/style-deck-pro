"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="max-w-5xl mx-auto px-6 py-20 text-center">
      <p className="text-4xl mb-4">⚠</p>
      <h1 className="text-xl font-semibold mb-2">Admin error</h1>
      <p className="text-gray-500 text-sm mb-2">{error.message ?? "An unexpected error occurred."}</p>
      {error.digest && (
        <p className="text-xs text-gray-400 mb-6 font-mono">Digest: {error.digest}</p>
      )}
      <div className="flex justify-center gap-3">
        <button
          onClick={reset}
          className="bg-black text-white text-sm px-5 py-2 rounded-lg hover:bg-gray-800 transition-colors"
        >
          Try again
        </button>
        <Link
          href="/admin"
          className="border border-gray-200 text-sm px-5 py-2 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}
