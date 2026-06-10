export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-10 animate-pulse">
      <div className="flex items-center justify-between mb-8">
        <div className="h-8 w-28 bg-gray-100 rounded-lg" />
        <div className="flex gap-3">
          <div className="h-9 w-24 bg-gray-100 rounded-md" />
          <div className="h-9 w-28 bg-gray-200 rounded-md" />
        </div>
      </div>
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-4 py-3 border-b border-gray-50">
            <div className="h-5 flex-1 bg-gray-100 rounded" />
            <div className="h-5 w-20 bg-gray-100 rounded" />
            <div className="h-5 w-16 bg-gray-100 rounded" />
            <div className="h-5 w-16 bg-gray-100 rounded" />
            <div className="h-5 w-14 bg-gray-100 rounded" />
            <div className="h-5 w-8 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
