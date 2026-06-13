"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export type RowAction = {
  key: string;
  label: string;
  onClick?: () => void;
  href?: string;
  variant?: "default" | "danger";
  disabled?: boolean;
};

/**
 * "⋯" row-actions dropdown. Pass `panel` to replace the dropdown with an
 * inline panel (edit form, confirmation step, etc.) anchored to the same
 * position -- the caller owns the open/close state for that panel.
 */
export function ActionsMenu({
  actions,
  panel,
  panelWidth = "w-64",
}: {
  actions: RowAction[];
  panel?: React.ReactNode;
  panelWidth?: string;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  if (panel) {
    return <div className={`text-left ${panelWidth} ml-auto`}>{panel}</div>;
  }

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-gray-400 hover:text-black dark:hover:text-white px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
        aria-label="Row actions"
      >
        ⋯
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-1 w-44 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg py-1 text-sm">
          {actions.map((a) =>
            a.href ? (
              <Link
                key={a.key}
                href={a.href}
                onClick={() => setOpen(false)}
                className="block w-full text-left px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800/60"
              >
                {a.label}
              </Link>
            ) : (
              <button
                key={a.key}
                disabled={a.disabled}
                onClick={() => {
                  a.onClick?.();
                  setOpen(false);
                }}
                className={`block w-full text-left px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800/60 disabled:opacity-50 ${
                  a.variant === "danger" ? "text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" : ""
                }`}
              >
                {a.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
