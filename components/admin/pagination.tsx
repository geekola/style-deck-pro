export function Pagination({
  page,
  pageCount,
  totalCount,
  pageSize,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex items-center justify-between mt-4 text-sm text-gray-500 dark:text-gray-400">
      <span>
        {totalCount === 0
          ? "0 results"
          : `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, totalCount)} of ${totalCount}`}
      </span>
      <div className="flex items-center gap-2">
        <button
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="border border-gray-200 dark:border-gray-700 rounded-md px-3 py-1 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800/60"
        >
          Previous
        </button>
        <span className="px-2 py-1 tabular-nums">
          {page} / {pageCount}
        </span>
        <button
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
          className="border border-gray-200 dark:border-gray-700 rounded-md px-3 py-1 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800/60"
        >
          Next
        </button>
      </div>
    </div>
  );
}
