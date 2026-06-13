export type SortDir = "asc" | "desc";

export function SortableHeader<T extends string>({
  label,
  sortKey,
  currentKey,
  dir,
  onSort,
  className,
}: {
  label: string;
  sortKey: T;
  currentKey: T;
  dir: SortDir;
  onSort: (key: T) => void;
  className?: string;
}) {
  const indicator = currentKey === sortKey ? (dir === "asc" ? " ↑" : " ↓") : "";

  return (
    <th
      className={`pb-3 font-medium cursor-pointer select-none ${className ?? ""}`}
      onClick={() => onSort(sortKey)}
    >
      {label}
      {indicator}
    </th>
  );
}
