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
  brandName: string;
  active: boolean;
  heroImage: string | null;
};

const CATEGORY_ORDER = ["casual", "business", "formal", "custom"];

export default function SavedPage() {
  const [items, setItems] = useState<SavedProduct[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/customer/saved");
    if (res.ok) setItems(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function remove(productId: string) {
    await fetch(`/api/customer/saved?productId=${productId}`, { method: "DELETE" });
    setItems((prev) => prev.filter((i) => i.id !== productId));
  }

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
        <span className="text-sm text-gray-400 dark:text-gray-500">{items.length}</span>
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
        <div className="pb-12">
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
                  {catItems.map((item) => (
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
                        <span className="absolute top-2 right-2 text-xs bg-white dark:bg-gray-950/90 rounded-full px-2 py-0.5 font-medium">
                          {item.itemType === "gift" ? "Gift" : item.price != null ? `$${(item.price / 100).toFixed(0)}` : "—"}
                        </span>
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
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
