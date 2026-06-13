export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 mb-4">
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            value === t.value
              ? "border-black dark:border-white text-black dark:text-white"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
