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
  returnPolicy: string | null;
  brandName: string;
  brandLogoUrl: string | null;
  heroImage: string | null;
};

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div className="bg-gray-900 dark:bg-white dark:text-gray-900 text-white text-sm font-medium px-4 py-2.5 rounded-full shadow-lg">
        {message}
      </div>
    </div>
  );
}

// ─── Product Detail Sheet ─────────────────────────────────────────────────────

function ProductDetailSheet({
  product,
  onClose,
  onSwipe,
}: {
  product: Product | null;
  onClose: () => void;
  onSwipe: (productId: string, direction: "left" | "right") => void;
}) {
  if (!product) return null;

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-950 rounded-t-2xl max-h-[55vh] flex flex-col shadow-xl">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-8 h-1 rounded-full bg-gray-200 dark:bg-gray-700" />
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1">
          <div className="px-5 pt-1 pb-3 flex gap-4">
            {/* Thumbnail */}
            <div className="w-20 h-24 rounded-xl bg-gray-100 dark:bg-gray-800 shrink-0 overflow-hidden relative">
              {product.heroImage ? (
                <img src={product.heroImage} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl opacity-20">✦</div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 space-y-1.5 pt-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500 capitalize">{product.category}</span>
                <span className={`text-xs rounded-full px-2 py-0.5 font-medium text-white ${product.itemType === "gift" ? "bg-emerald-600" : "bg-black/70 dark:bg-white/20"}`}>
                  {product.itemType === "gift" ? "Gift" : product.price != null ? `$${(product.price / 100).toFixed(0)}` : "—"}
                </span>
              </div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white leading-snug">{product.name}</h2>
              <div className="flex items-center gap-1.5">
                {product.brandLogoUrl && (
                  <img src={product.brandLogoUrl} alt={product.brandName} className="w-4 h-4 rounded-full border border-gray-100 dark:border-gray-800 object-cover bg-white shrink-0" />
                )}
                <span className="text-xs text-gray-400 dark:text-gray-500 truncate">{product.brandName}</span>
              </div>
              {product.itemType === "purchase" && product.price != null && (
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">${(product.price / 100).toFixed(2)}</p>
              )}
              {product.itemType === "gift" && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400">Available as a gift</p>
              )}
            </div>
          </div>

          {/* Description + return policy */}
          <div className="px-5 pb-3 space-y-3 border-t border-gray-100 dark:border-gray-800 pt-3">
            {product.description && (
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{product.description}</p>
            )}

            {product.returnPolicy && (
              <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">Returns: {product.returnPolicy}</p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="shrink-0 border-t border-gray-100 dark:border-gray-800 px-5 py-4 flex gap-3">
          <button
            onClick={() => { onSwipe(product.id, "left"); onClose(); }}
            className="flex-1 py-3 rounded-xl border border-red-200 dark:border-red-900 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            Pass
          </button>
          <button
            onClick={() => { onSwipe(product.id, "right"); onClose(); }}
            className="flex-1 py-3 rounded-xl bg-black dark:bg-white dark:text-black text-white text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
          >
            Save ♥
          </button>
        </div>
      </div>
    </div>
  );
}

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
  const likeOpacity = dragState && dragState.dx > 30 ? Math.min(1, (dragState.dx - 30) / 80) : 0;
  const passOpacity = dragState && dragState.dx < -30 ? Math.min(1, (-dragState.dx - 30) / 80) : 0;

  return (
    <div
      className="absolute inset-0 rounded-2xl border border-black/8 overflow-hidden select-none touch-none bg-gray-100 dark:bg-gray-800"
      style={{ cursor: isTop ? "grab" : "default", ...style }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      {product.heroImage ? (
        <img src={product.heroImage} alt={product.name} className="w-full h-full object-cover" draggable={false} />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700">
          <span className="text-6xl opacity-20">✦</span>
        </div>
      )}

      <div className="absolute top-0 left-0 right-0 p-5 flex justify-between items-start">
        <span className="text-xs uppercase tracking-widest text-white/80 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1">
          {product.category}
        </span>
        <span className={`text-xs rounded-full px-3 py-1 font-medium text-white ${product.itemType === "gift" ? "bg-emerald-600" : "bg-black/70 backdrop-blur-sm"}`}>
          {product.itemType === "gift" ? "Gift" : product.price != null ? `$${(product.price / 100).toFixed(0)}` : "—"}
        </span>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black/70 to-transparent">
        <div className="text-white font-semibold text-xl leading-tight mb-1">{product.name}</div>
        <div className="text-white/60 text-sm flex items-center gap-1.5">
          {product.brandLogoUrl && (
            <img src={product.brandLogoUrl} alt="" className="w-4 h-4 rounded-full border border-white/30 object-cover" draggable={false} />
          )}
          {product.brandName}
        </div>
        {isTop && (
          <p className="text-white/40 text-xs mt-2">Tap for details</p>
        )}
      </div>

      {isTop && likeOpacity > 0 && (
        <div className="absolute top-7 left-5 bg-green-500 text-white rounded-lg px-3 py-1.5 text-sm font-bold tracking-widest border-2 border-white" style={{ opacity: likeOpacity }}>
          SAVE
        </div>
      )}
      {isTop && passOpacity > 0 && (
        <div className="absolute top-7 right-5 bg-red-500 text-white rounded-lg px-3 py-1.5 text-sm font-bold tracking-widest border-2 border-white" style={{ opacity: passOpacity }}>
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
  onLow,
  onTap,
}: {
  products: Product[];
  onSwipe: (productId: string, direction: "left" | "right") => void;
  onUndo: () => void;
  onLow: () => void;
  onTap: (product: Product) => void;
}) {
  const [deck, setDeck] = useState(products);
  const [undoStack, setUndoStack] = useState<Product[]>([]);
  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null);
  const [exiting, setExiting] = useState<{ dir: "left" | "right" } | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const seenIdsRef = useRef(new Set(products.map((p) => p.id)));
  const onLowRef = useRef(onLow);
  onLowRef.current = onLow;

  // Append new products without resetting deck
  useEffect(() => {
    const newItems = products.filter((p) => !seenIdsRef.current.has(p.id));
    if (newItems.length > 0) {
      newItems.forEach((p) => seenIdsRef.current.add(p.id));
      setDeck((d) => [...newItems, ...d]);
    }
  }, [products]);

  const exit = useCallback(
    (dir: "left" | "right") => {
      if (deck.length === 0) return;
      const top = deck[deck.length - 1];
      setExiting({ dir });
      const nextLength = deck.length - 1;
      setTimeout(() => {
        setDeck((d) => d.slice(0, -1));
        setUndoStack((u) => [top, ...u.slice(0, 4)]);
        setExiting(null);
        onSwipe(top.id, dir);
        if (nextLength <= 3) onLowRef.current();
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
    const { dx, dy } = drag;
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      // Tap — open detail
      const top = deck[deck.length - 1];
      if (top) onTap(top);
    } else if (Math.abs(dx) > 80) {
      exit(dx > 0 ? "right" : "left");
    }
    setDrag(null);
    startRef.current = null;
  }, [drag, exit, deck, onTap]);

  const visible = deck.slice(Math.max(0, deck.length - 3));

  return (
    <div className="flex flex-col items-center gap-7">
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
            if (isTop && drag) { transform = `translate(${drag.dx}px, ${drag.dy * 0.3}px) rotate(${drag.dx / 18}deg)`; transition = "none"; }
            if (isTop && exiting) { transform = `translateX(${exiting.dir === "right" ? 500 : -500}px) rotate(${exiting.dir === "right" ? 25 : -25}deg)`; transition = "transform 0.28s ease"; }
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

      <div className="flex items-center gap-4">
        <button onClick={() => exit("left")} disabled={deck.length === 0}
          className="w-14 h-14 rounded-full border border-red-200 bg-white dark:bg-gray-950 shadow-sm flex items-center justify-center text-2xl disabled:opacity-30 hover:bg-red-50 transition-colors"
          aria-label="Pass">✕</button>
        <button onClick={handleUndo} disabled={undoStack.length === 0}
          className="w-10 h-10 rounded-full border border-black/10 dark:border-white/10 bg-white dark:bg-gray-950 shadow-sm flex items-center justify-center text-base disabled:opacity-25 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
          aria-label="Undo">↩</button>
        <button onClick={() => exit("right")} disabled={deck.length === 0}
          className="w-14 h-14 rounded-full border border-green-200 bg-white dark:bg-gray-950 shadow-sm flex items-center justify-center text-2xl disabled:opacity-30 hover:bg-green-50 transition-colors"
          aria-label="Save">♥</button>
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500">{deck.length} remaining</p>
    </div>
  );
}

// ─── Main Experience ──────────────────────────────────────────────────────────

export function SwipeExperience({ userName, hasMeasurements }: { userName: string; hasMeasurements: boolean }) {
  const [category, setCategory] = useState<Category | null>(null);
  const [itemType, setItemType] = useState<"gift" | "purchase" | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const categoryRef = useRef<Category | null>(null);
  const itemTypeRef = useRef<"gift" | "purchase" | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && !window.localStorage.getItem("styledeck_onboarding_seen")) {
      setShowOnboarding(true);
    }
  }, []);

  function dismissOnboarding() {
    window.localStorage.setItem("styledeck_onboarding_seen", "1");
    setShowOnboarding(false);
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }

  async function fetchProducts(cat: Category, type: "gift" | "purchase" | null, append = false) {
    const params = new URLSearchParams({ category: cat, limit: "20" });
    if (type) params.set("itemType", type);
    const res = await fetch(`/api/customer/products?${params.toString()}`);
    if (!res.ok) return;
    const data: Product[] = await res.json();
    setProducts((prev) => append ? [...prev, ...data] : data);
  }

  async function loadCategory(cat: Category) {
    setCategory(cat);
    categoryRef.current = cat;
    setProducts([]);
    setLoading(true);
    await fetchProducts(cat, itemTypeRef.current);
    setLoading(false);
  }

  async function setOfferFilter(type: "gift" | "purchase" | null) {
    setItemType(type);
    itemTypeRef.current = type;
    if (categoryRef.current) {
      setLoading(true);
      await fetchProducts(categoryRef.current, type);
      setLoading(false);
    }
  }

  async function handleLow() {
    if (!categoryRef.current || loadingMore) return;
    setLoadingMore(true);
    await fetchProducts(categoryRef.current, itemTypeRef.current, true);
    setLoadingMore(false);
  }

  function handleSwipe(productId: string, direction: "left" | "right") {
    fetch("/api/customer/swipe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, direction }),
    }).catch(console.error);
    if (direction === "right") showToast("Saved ✓");
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col max-w-lg mx-auto">
      {/* Onboarding overlay */}
      {showOnboarding && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-5">
          <div className="bg-white dark:bg-gray-950 rounded-2xl max-w-sm w-full p-6 shadow-xl">
            <h2 className="text-xl font-semibold mb-1">Welcome, {userName.split(" ")[0]}!</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Here&apos;s how StyleDeck works:</p>
            <ul className="space-y-4 mb-6">
              <li className="flex items-start gap-3"><span className="text-2xl leading-none">♥</span><span className="text-sm text-gray-700 dark:text-gray-300">Swipe right (or tap ♥) to <strong>save</strong> something you like.</span></li>
              <li className="flex items-start gap-3"><span className="text-2xl leading-none">✕</span><span className="text-sm text-gray-700 dark:text-gray-300">Swipe left (or tap ✕) to <strong>pass</strong>.</span></li>
              <li className="flex items-start gap-3"><span className="text-2xl leading-none">👆</span><span className="text-sm text-gray-700 dark:text-gray-300"><strong>Tap a card</strong> to see full product details before deciding.</span></li>
              <li className="flex items-start gap-3"><span className="text-2xl leading-none">📏</span><span className="text-sm text-gray-700 dark:text-gray-300">Add your <strong>measurements</strong> before ordering.</span></li>
            </ul>
            <button onClick={dismissOnboarding} className="w-full bg-black dark:bg-white dark:text-black text-white text-sm font-medium py-3 rounded-xl hover:bg-gray-800">
              Got it, let&apos;s go
            </button>
          </div>
        </div>
      )}

      {/* Product detail sheet */}
      <ProductDetailSheet
        product={detailProduct}
        onClose={() => setDetailProduct(null)}
        onSwipe={(id, dir) => {
          handleSwipe(id, dir);
          // Remove from deck by triggering a swipe event — deck handles via onSwipe callback
        }}
      />

      {/* Toast */}
      <Toast message={toast} />

      {/* Nav */}
      <nav className="sticky top-0 z-20 bg-white dark:bg-gray-950 border-b border-black/6 dark:border-white/10 px-5 py-3.5 flex items-center justify-between">
        <span className="text-xl font-semibold tracking-tight">StyleDeck</span>
        <div className="flex items-center gap-2">
          <Link href="/app/saved" className="text-sm px-3.5 py-1.5 rounded-full border border-black/10 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors">Saved</Link>
          <Link
            href="/app/profile"
            className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${hasMeasurements ? "bg-black dark:bg-white dark:text-black text-white border-black dark:border-white" : "bg-gray-100 dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700"}`}
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
        <div className="mx-5 mt-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3.5 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-amber-900 dark:text-amber-300">Complete your measurements</p>
            <p className="text-xs text-amber-700 dark:text-amber-500 mt-0.5">Required before ordering</p>
          </div>
          <Link href="/app/profile" className="text-xs bg-amber-900 dark:bg-amber-600 text-white rounded-lg px-3 py-1.5 font-medium">Add now</Link>
        </div>
      )}

      {/* Category pills */}
      <div className="px-5 pt-5 pb-2">
        <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Category</p>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => loadCategory(cat)}
              className={`shrink-0 text-sm px-4 py-2 rounded-full border capitalize transition-colors ${
                category === cat
                  ? "bg-black dark:bg-white dark:text-black text-white border-black dark:border-white"
                  : "border-black/12 dark:border-white/15 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Offer type filter */}
      <div className="px-5 pb-2">
        <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Offer Type</p>
        <div className="flex items-center gap-2">
          {([{ label: "All", value: null }, { label: "Gift", value: "gift" as const }, { label: "Purchase", value: "purchase" as const }]).map((opt) => (
            <button
              key={opt.label}
              onClick={() => setOfferFilter(opt.value)}
              className={`text-sm px-3.5 py-1.5 rounded-full border transition-colors ${
                itemType === opt.value
                  ? "bg-black dark:bg-white dark:text-black text-white border-black dark:border-white"
                  : "border-black/12 dark:border-white/15 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60"
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
            Select a category<br /><span className="text-sm font-normal">to start swiping</span>
          </p>
        ) : loading ? (
          <div className="text-gray-400 dark:text-gray-500 text-sm">Loading…</div>
        ) : (
          <SwipeDeck
            key={category}
            products={products}
            onSwipe={handleSwipe}
            onUndo={() => {}}
            onLow={handleLow}
            onTap={setDetailProduct}
          />
        )}
      </div>
      {loadingMore && (
        <p className="text-center text-xs text-gray-300 dark:text-gray-600 pb-4">Loading more…</p>
      )}
    </div>
  );
}
