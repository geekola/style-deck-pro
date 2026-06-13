export function StatCardGrid({
  children,
  cols = 3,
}: {
  children: React.ReactNode;
  cols?: 2 | 3 | 4 | 5;
}) {
  const colsClass =
    cols === 5
      ? "grid-cols-2 md:grid-cols-5"
      : cols === 4
        ? "grid-cols-2 md:grid-cols-4"
        : cols === 2
          ? "grid-cols-2"
          : "grid-cols-3";

  return <div className={`grid ${colsClass} gap-3 mb-6`}>{children}</div>;
}

export function StatCard({
  label,
  value,
  active,
  onClick,
  accent,
}: {
  label: string;
  value: number;
  active?: boolean;
  onClick?: () => void;
  accent?: "green" | "red" | "amber";
}) {
  const accentClass =
    accent === "green"
      ? "text-green-700 dark:text-green-400"
      : accent === "red"
        ? "text-red-700 dark:text-red-400"
        : accent === "amber"
          ? "text-amber-700 dark:text-amber-400"
          : "";

  const content = (
    <>
      <div className={`text-2xl font-semibold ${accentClass}`}>{value}</div>
      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{label}</div>
    </>
  );

  const className = `text-left border rounded-lg p-4 transition-colors ${
    active
      ? "border-black dark:border-white bg-gray-50 dark:bg-gray-800/60"
      : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60"
  }`;

  if (!onClick) {
    return <div className={className.replace("text-left ", "")}>{content}</div>;
  }

  return (
    <button onClick={onClick} className={className}>
      {content}
    </button>
  );
}
