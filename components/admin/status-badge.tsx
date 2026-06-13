const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400",
  approved: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400",
  suspended: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
  pending: "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400",
  rejected: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
};

const DEFAULT_COLOR = "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400";

export function StatusBadge({ status }: { status: string }) {
  const colorClass = STATUS_COLORS[status] ?? DEFAULT_COLOR;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${colorClass}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}
