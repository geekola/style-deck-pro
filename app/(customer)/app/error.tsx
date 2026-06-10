"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function CustomerError({
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
    <div className="min-h-screen bg-white flex flex-col items-center justify-center max-w-lg mx-auto px-5 text-center">
      <p className="text-5xl mb-5">✕</p>
      <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
      <p className="text-gray-400 text-sm mb-8">
        We hit a snag. Please try again or go back to discover.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="bg-black text-white text-sm px-5 py-2.5 rounded-lg hover:bg-gray-800 transition-colors"
        >
          Try again
        </button>
        <Link
          href="/app/discover"
          className="border border-gray-200 text-sm px-5 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Back to Discover
        </Link>
      </div>
    </div>
  );
}
