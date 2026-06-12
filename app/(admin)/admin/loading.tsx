export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-10 animate-pulse">
      <div className="h-8 w-44 bg-gray-100 dark:bg-gray-800 rounded-lg mb-8" />
      <div className="grid grid-cols-4 gap-3 mb-10">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border border-gray-100 dark:border-gray-800 rounded-lg p-4">
            <div className="h-8 w-12 bg-gray-100 dark:bg-gray-800 rounded mb-2" />
            <div className="h-4 w-20 bg-gray-100 dark:bg-gray-800 rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border border-gray-100 dark:border-gray-800 rounded-lg p-5">
            <div className="h-5 w-16 bg-gray-100 dark:bg-gray-800 rounded mb-2" />
            <div className="h-4 w-40 bg-gray-100 dark:bg-gray-800 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
