"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";

const CATEGORIES = ["casual", "business", "formal", "custom"] as const;
type Category = (typeof CATEGORIES)[number];

type Product = {
  id: string;
  name: string;
  category: Category;
  itemType: "gift" | "purchase";
  description: string | null;
  price: number | null;
  brandName: string;
  heroImage: string | null;
};

// ─── Product Card ─────────────────────────────────────────────────────────────

function ProductCard({
  product,
  isTop,
  style,
  dragState,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  product: Product;
  isTop: boolean;
  style: React.CSSProperties;
  dragState: { dx: number; dy: number } | null;
  onPointerDown?: React.PointerEventHandler;
  onPointerMove?: React.PointerEventHandler;
  onPointerUp?: React.PointerEventHandler;
}) {
  const likeOpacity =
    dragState && dragState.dx > 30
      ? Math.min(1, (dragState.dx - 30) / 80)
      : 0;
  const passOpacity =
    dragState && dragState.dx < -30
      ? Math.min(1, (-dragState.dx - 30) / 80)
      : 0;

  return (
    <div
      className="absolute inset-0 rounded-2xl border border-black/8 overflow-hidden select-none touch-none bg-gray-100 dark:bg-gray-800"
      style={{ cursor: isTop ? "grab" : "default", ...style }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      {/* Image or placeholder */}
      {product.heroImage ? (
        <img
          src={product.heroImage}
          alt={product.name}
          className="w-full h-full object-cover"
          draggable={false}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
          <span className="text-6xl opacity-20">✦</span>
        </div>
      )}

      {/* Top labels */}
      <div className="absolute top-0 left-0 right-0 p-5 flex justify-between items-start">
        <span className="text-xs uppercase tracking-widest text-white/70 bg-black dark:bg-white dark:text-black backdrop-blur-sm rounded-full px-3 py-1">
          {product.category}
        </span>
        <span className="text-xs bg-white dark:bg-gray-950/90 text-gray-700 dark:text-gray-300 dark:text-gray-600 rounded-full px-3 py-1 font-medium">
          {product.itemType === "gift" ? "Gift" : product.price != null ? `$${(product.price / 100).toFixed(0)}` : "—"}
        </span>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black/70 to-transparent">
        <div className="text-white font-semibold text-xl leading-tight mb-1">
          {product.name}
        </div>
        <div className="text-white/60 text-sm">{product.brandName}</div>
      </div>

      {/* Swipe indicators */}
      {isTop && likeOpacity > 0 && (
        <div
          className="absolute top-7 left-5 bg-green-500 text-white rounded-lg px-3 py-1.5 text-sm font-bold tracking-widest border-2 border-white"
          style={{ opacity: likeOpacity }}
        >
          SAVE
        </div>
      )}
      {isTop && passOpacity > 0 && (
        <div
          className="absolute top-7 right-5 bg-red-500 text-white rounded-lg px-3 py-1.5 text-sm font-bold tracking-widest border-2 border-white"
          style={{ opacity: passOpacity }}
        >
          PASS
        </div>
      )}
    </div>
  );
}

// ─── Swipe Deck ───────────────────────────────────────────────────────────────

function SwipeDeck({
  products,
  onSwipe,
  onUndo,
}: {
  products: Product[];
  onSwipe: (productId: string, direction: "left" | "right") => void;
  onUndo: () => void;
}) {
  const [deck, setDeck] = useState(products);
  const [undoStack, setUndoStack] = useState<Product[]>([]);
  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null);
  const [exiting, setExiting] = useState<{ dir: "left" | "right" } | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);

  // Sync deck when products prop changes (new batch loaded)
  useEffect(() => {
    setDeck(products);
  }, [products]);

  const exit = useCallback(
    (dir: "left" | "right") => {
      if (deck.length === 0) return;
      const top = deck[deck.length - 1];
      setExiting({ dir });
      setTimeout(() => {
        setDeck((d) => d.slice(0, -1));
        setUndoStack((u) => [top, ...u.slice(0, 4)]);
        setExiting(null);
        onSwipe(top.id, dir);
      }, 280);
    },
    [deck, onSwipe]
  );

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const [last, ...rest] = undoStack;
    setDeck((d) => [...d, last]);
    setUndoStack(rest);
    onUndo();
  };

  const onDown = useCallback((e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    startRef.current = { x: e.clientX, y: e.clientY };
    setDrag({ dx: 0, dy: 0 });
  }, []);

  const onMove = useCallback((e: React.PointerEvent) => {
    if (!startRef.current) return;
    setDrag({ dx: e.clientX - startRef.current.x, dy: e.clientY - startRef.current.y });
  }, []);

  const onUp = useCallback(() => {
    if (!drag) return;
    if (Math.abs(drag.dx) > 80) exit(drag.dx > 0 ? "right" : "left");
    setDrag(null);
    startRef.current = null;
  }, [drag, exit]);

  const visible = deck.slice(Math.max(0, deck.length - 3));

  return (
    <div className="flex flex-col items-center gap-7">
      {/* Card stack */}
      <div className="relative w-80 h-[460px]">
        {deck.length === 0 ? (
          <div className="w-full h-full rounded-2xl border-2 border-dashed border-black/10 dark:border-white/10 flex flex-col items-center justify-center gap-3 text-gray-400 dark:text-gray-500">
            <span className="text-4xl">✓</span>
            <span className="text-sm">All caught up</span>
          </div>
        ) : (
          visible.map((product, i) => {
            const isTop = i === visible.length - 1;
            const depth = visible.length - 1 - i;

            let transform = `translateY(${depth * 10}px) scale(${1 - depth * 0.04})`;
            let transition = "transform 0.3s ease";
            const zIndex = i;

            if (isTop && drag) {
              transform = `translate(${drag.dx}px, ${drag.dy * 0.3}px) rotate(${drag.dx / 18}deg)`;
              transition = "none";
            }
            if (isTop && exiting) {
              transform = `translateX(${exiting.dir === "right" ? 500 : -500}px) rotate(${exiting.dir === "right" ? 25 : -25}deg)`;
              transition = "transform 0.28s ease";
            }

            return (
              <ProductCard
                key={product.id}
                product={product}
                isTop={isTop}
                dragState={isTop ? drag : null}
                style={{ transform, transition, zIndex, opacity: 1 - depth * 0.15 }}
                onPointerDown={isTop ? onDown : undefined}
                onPointerMove={isTop ? onMove : undefined}
                onPointerUp={isTop ? onUp : undefined}
              />
            );
          })
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => exit("left")}
          disabled={deck.length === 0}
          className="w-14 h-14 rounded-full border border-red-200 bg-white dark:bg-gray-950 shadow-sm flex items-center justify-center text-2xl disabled:opacity-30 hover:bg-red-50 transition-colors"
          aria-label="Pass"
        >
          ✕
        </button>
        <button
          onClick={handleUndo}
          disabled={undoStack.length === 0}
          className="w-10 h-10 rounded-full border border-black/10 dark:border-white/10 bg-white dark:bg-gray-950 shadow-sm flex items-center justify-center text-base disabled:opacity-25 hover:bg-gray-50 dark:hover:bg-gray-800/60 dark:bg-gray-900 transition-colors"
          aria-label="Undo"
        >
          ↩
        </button>
        <button
          onClick={() => exit("right")}
          disabled={deck.length === 0}
          className="w-14 h-14 rounded-full border border-green-200 bg-white dark:bg-gray-950 shadow-sm flex items-center justify-center text-2xl disabled:opacity-30 hover:bg-green-50 transition-colors"
          aria-label="Save"
        >
          ♥
        </button>
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500">
        {deck.length} remaining
      </p>
    </div>
  );
}

// ─── Main Experience ──────────────────────────────────────────────────────────

export function SwipeExperience({
  userName,
  hasMeasurements,
}: {
  userName: string;
  hasMeasurements: boolean;
}) {
  const [category, setCategory] = useState<Category | null>(null);
  const [itemType, setItemType] = useState<"gift" | "purchase" | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  async function loadProducts(cat: Category, type: "gift" | "purchase" | null) {
    setLoading(true);
    const params = new URLSearchParams({ category: cat, limit: "20" });
    if (type) params.set("itemType", type);
    const res = await fetch(`/api/customer/products?${params.toString()}`);
    if (res.ok) setProducts(await res.json());
    setLoading(false);
  }

  async function loadCategory(cat: Category) {
    setCategory(cat);
    setDropdownOpen(false);
    await loadProducts(cat, itemType);
  }

  async function setOfferFilter(type: "gift" | "purchase" | null) {
    setItemType(type);
    if (category) await loadProducts(category, type);
  }

  function handleSwipe(productId: string, direction: "left" | "right") {
    fetch("/api/customer/swipe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, direction }),
    }).catch(console.error);
  }

  // When deck runs low, silently load more
  function handleUndo() {
    // no-op for undo — swipe event already recorded; accept minor inconsistency for MVP
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col max-w-lg mx-auto">
      {/* Nav */}
      <nav className="sticky top-0 z-20 bg-white dark:bg-gray-950 border-b border-black/6 dark:border-white/10 px-5 py-3.5 flex items-center justify-between">
        <span className="text-xl font-semibold tracking-tight">StyleDeck</span>
        <div className="flex items-center gap-2">
          <Link
            href="/app/saved"
            className="text-sm px-3.5 py-1.5 rounded-full border border-black/10 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-gray-800/60 dark:bg-gray-900 transition-colors"
          >
            Saved
          </Link>
          <Link
            href="/app/profile"
            className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
              hasMeasurements
                ? "bg-black dark:bg-white dark:text-black text-white border-black dark:border-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700"
            }`}
            title="Measurement profile"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </Link>
        </div>
      </nav>

      {/* Measurements prompt */}
      {!hasMeasurements && (
        <div className="mx-5 mt-4 rounded-xl bg-amber-50 border border-amber-200 p-3.5 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-amber-900">Complete your measurements</p>
            <p className="text-xs text-amber-700 mt-0.5">Required before ordering</p>
          </div>
          <Link
            href="/app/profile"
            className="text-xs bg-amber-900 text-white rounded-lg px-3 py-1.5 font-medium"
          >
            Add now
          </Link>
        </div>
      )}

      {/* Category picker */}
      <div className="px-5 pt-5 pb-2">
        <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Category</p>
        <div className="relative">
          <button
            onClick={() => setDropdownOpen((o) => !o)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-black/12 bg-white dark:bg-gray-950 text-sm"
          >
            <span className={category ? "font-medium text-gray-900 dark:text-white capitalize" : "text-gray-400 dark:text-gray-500"}>
              {category ?? "Select a category to start…"}
            </span>
            <span className={`text-xs text-gray-400 dark:text-gray-500 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}>
              ▼
            </span>
          </button>

          {dropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-gray-950 border border-black/8 rounded-xl shadow-lg z-30 overflow-hidden">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => loadCategory(cat)}
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-800/60 dark:bg-gray-900 transition-colors capitalize border-b border-black/5 last:border-0 ${
                    category === cat ? "font-medium" : ""
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Offer type filter */}
      <div className="px-5 pb-2">
        <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Offer Type</p>
        <div className="flex items-center gap-2">
          {(
            [
              { label: "All", value: null },
              { label: "Gift", value: "gift" as const },
              { label: "Purchase", value: "purchase" as const },
            ]
          ).map((opt) => (
            <button
              key={opt.label}
              onClick={() => setOfferFilter(opt.value)}
              className={`text-sm px-3.5 py-1.5 rounded-full border transition-colors ${
                itemType === opt.value
                  ? "bg-black dark:bg-white dark:text-black text-white border-black dark:border-white"
                  : "border-black/12 dark:border-white/15 hover:bg-gray-50 dark:hover:bg-gray-800/60"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Swipe area */}
      <div className="flex-1 flex items-center justify-center px-5 py-6">
        {!category ? (
          <p className="text-gray-300 dark:text-gray-600 text-center text-lg">
            Select a category<br />
            <span className="text-sm font-normal">to start swiping</span>
          </p>
        ) : loading ? (
          <div className="text-gray-400 dark:text-gray-500 text-sm">Loading…</div>
        ) : (
          <SwipeDeck
            key={category}
            products={products}
            onSwipe={handleSwipe}
            onUndo={handleUndo}
          />
        )}
      </div>
    </div>
  );
}
