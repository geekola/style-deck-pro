export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex-1 min-w-[220px] text-sm border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 bg-white dark:bg-gray-950 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
    />
  );
}

export function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-sm border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 bg-white dark:bg-gray-950 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
