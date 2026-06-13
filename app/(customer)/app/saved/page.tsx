"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type SavedProduct = {
  savedId: string;
  savedAt: string;
  id: string;
  name: string;
  category: string;
  itemType: "gift" | "purchase";
  price: number | null;
  brandId: string;
  brandName: string;
  brandLogoUrl: string | null;
  active: boolean;
  heroImage: string | null;
};

const CATEGORY_ORDER = ["casual", "business", "formal", "custom"];

export default function SavedPage() {
  const [items, setItems] = useState<SavedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  async function load() {
    const res = await fetch("/api/customer/saved");
    if (res.ok) setItems(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function remove(productId: string) {
    await fetch(`/api/customer/saved?productId=${productId}`, { method: "DELETE" });
    setItems((prev) => prev.filter((i) => i.id !== productId));
    setSelected((prev) => {
      if (!prev.has(productId)) return prev;
      const next = new Set(prev);
      next.delete(productId);
      return next;
    });
  }

  function toggleSelectMode() {
    setSelectMode((m) => !m);
    setSelected(new Set());
  }

  function toggleSelected(item: SavedProduct) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.add(item.id);
      }
      return next;
    });
  }

  const selectedItems = items.filter((i) => selected.has(i.id));
  const selectedBrandId = selectedItems[0]?.brandId ?? null;
  const selectedTotal = selectedItems.reduce((sum, i) => sum + (i.price ?? 0), 0);

  const grouped = CATEGORY_ORDER.reduce<Record<string, SavedProduct[]>>((acc, cat) => {
    acc[cat] = items.filter((i) => i.category === cat);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 max-w-lg mx-auto">
      {/* Nav */}
      <nav className="sticky top-0 z-20 bg-white dark:bg-gray-950 border-b border-black/6 dark:border-white/10 px-5 py-3.5 flex items-center justify-between">
        <Link href="/app/discover" className="text-sm text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white dark:text-white">← Discover</Link>
        <span className="text-xl font-semibold tracking-tight">Saved</span>
        <button
          onClick={toggleSelectMode}
          className="text-sm text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white"
        >
          {selectMode ? "Cancel" : "Select"}
        </button>
      </nav>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400 dark:text-gray-500 text-sm">Loading…</div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400 dark:text-gray-500">
          <span className="text-5xl">♡</span>
          <p className="text-sm">Nothing saved yet</p>
          <Link href="/app/discover" className="text-sm text-black dark:text-white underline">Start swiping</Link>
        </div>
      ) : (
        <div className={selected.size > 0 ? "pb-24" : "pb-12"}>
          {/* Category counts */}
          <div className="grid grid-cols-4 gap-2 px-5 py-4">
            {CATEGORY_ORDER.map((cat) => (
              <div key={cat} className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3 text-center">
                <div className="text-xl font-semibold">{grouped[cat].length}</div>
                <div className="text-xs text-gray-400 dark:text-gray-500 capitalize mt-0.5">{cat}</div>
              </div>
            ))}
          </div>

          {CATEGORY_ORDER.map((cat) => {
            const catItems = grouped[cat];
            if (catItems.length === 0) return null;
            return (
              <section key={cat} className="mb-8">
                <div className="px-5 py-3 border-b border-black/5 flex items-baseline gap-2">
                  <h2 className="font-semibold capitalize">{cat}</h2>
                  <span className="text-xs text-gray-400 dark:text-gray-500">{catItems.length}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 px-5 pt-3">
                  {catItems.map((item) => {
                    const eligible = item.active && item.itemType === "purchase" && item.price != null;
                    const isSelected = selected.has(item.id);
                    const disabled =
                      eligible &&
                      selectedBrandId != null &&
                      selectedBrandId !== item.brandId &&
                      !isSelected;

                    return (
                      <div key={item.id} className="rounded-xl border border-black/8 overflow-hidden">
                        <div className="relative h-36 bg-gray-100 dark:bg-gray-800">
                          {item.heroImage ? (
                            <img src={item.heroImage} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-3xl opacity-20">✦</div>
                          )}
                          {!item.active && (
                            <div className="absolute inset-0 bg-white dark:bg-gray-950/70 flex items-center justify-center">
                              <span className="text-xs text-gray-400 dark:text-gray-500">Unavailable</span>
                            </div>
                          )}
                          {item.brandLogoUrl && (
                            <img
                              src={item.brandLogoUrl}
                              alt={item.brandName}
                              className="absolute bottom-2 right-2 w-6 h-6 rounded-full border-2 border-white object-cover bg-white shadow-md"
                            />
                          )}
                          <span className="absolute top-2 right-2 text-xs bg-white dark:bg-gray-950/90 rounded-full px-2 py-0.5 font-medium">
                            {item.itemType === "gift" ? "Gift" : item.price != null ? `$${(item.price / 100).toFixed(0)}` : "—"}
                          </span>
                          {selectMode && eligible && (
                            <button
                              onClick={() => !disabled && toggleSelected(item)}
                              disabled={disabled}
                              aria-label={isSelected ? "Deselect item" : "Select item"}
                              className={`absolute top-2 left-2 w-5 h-5 rounded-md border flex items-center justify-center text-xs ${
                                isSelected
                                  ? "bg-black dark:bg-white border-black dark:border-white text-white dark:text-black"
                                  : disabled
                                    ? "bg-white/60 dark:bg-gray-950/60 border-gray-300 dark:border-gray-700 opacity-40"
                                    : "bg-white dark:bg-gray-950/90 border-gray-300 dark:border-gray-600"
                              }`}
                            >
                              {isSelected ? "✓" : ""}
                            </button>
                          )}
                        </div>
                        <div className="p-3">
                          <p className="text-sm font-medium leading-tight">{item.name}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{item.brandName}</p>
                          <div className="flex items-center gap-2 mt-2">
                            {item.active && (
                              <Link
                                href={item.itemType === "gift" ? `/app/gift/${item.id}` : `/app/checkout/${item.id}`}
                                className="flex-1 text-center text-xs bg-black dark:bg-white dark:text-black text-white rounded-lg py-1.5 font-medium"
                              >
                                {item.itemType === "gift" ? "Request" : "Buy"}
                              </Link>
                            )}
                            <button
                              onClick={() => remove(item.id)}
                              className="text-xs text-gray-400 dark:text-gray-500 hover:text-red-500 px-2 py-1.5"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 max-w-lg mx-auto bg-white dark:bg-gray-950 border-t border-black/10 dark:border-white/10 px-5 py-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">
              {selected.size} item{selected.size > 1 ? "s" : ""} · ${(selectedTotal / 100).toFixed(2)}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{selectedItems[0]?.brandName}</p>
          </div>
          <Link
            href={`/app/checkout/multi?ids=${[...selected].join(",")}`}
            className="bg-black dark:bg-white dark:text-black text-white text-sm font-medium px-5 py-2.5 rounded-xl"
          >
            Checkout
          </Link>
        </div>
      )}
    </div>
  );
}
