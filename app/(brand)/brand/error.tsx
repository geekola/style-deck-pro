"use client";

import { useEffect } from "react";

export default function BrandError({
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
      <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
      <p className="text-gray-500 text-sm mb-6">
        {error.message ?? "An unexpected error occurred in the brand portal."}
      </p>
      <button
        onClick={reset}
        className="bg-black text-white text-sm px-5 py-2 rounded-lg hover:bg-gray-800 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
