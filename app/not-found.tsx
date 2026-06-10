import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
      <p className="text-6xl font-semibold text-gray-100 mb-4">404</p>
      <h1 className="text-xl font-semibold mb-2">Page not found</h1>
      <p className="text-gray-500 text-sm mb-8">
        This page doesn't exist or you don't have access.
      </p>
      <Link
        href="/"
        className="bg-black text-white text-sm px-5 py-2.5 rounded-lg hover:bg-gray-800 transition-colors"
      >
        Go home
      </Link>
    </div>
  );
}
