export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10 animate-pulse">
      <div className="h-8 w-32 bg-gray-100 rounded-lg mb-8" />
      <div className="h-5 w-36 bg-gray-100 rounded mb-4" />
      <div className="space-y-3 mb-10">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border border-gray-100 rounded-xl p-4">
            <div className="flex justify-between mb-3">
              <div className="h-4 w-40 bg-gray-100 rounded" />
              <div className="h-6 w-20 bg-gray-100 rounded-full" />
            </div>
            <div className="h-3 w-56 bg-gray-100 rounded mb-2" />
            <div className="h-3 w-32 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
