"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

const CATEGORIES = ["casual", "business", "formal", "custom"] as const;
type Visibility = "draft" | "hidden" | "live";

type ProductImage = { id: string; url: string; hero: boolean; displayOrder: number };

type ProductState = {
  name: string;
  category: string;
  itemType: string;
  description: string;
  price: string;
  costPrice: string;
  returnPolicy: string;
  visibility: Visibility;
  giftable: boolean;
  monthlyGiftLimit: string;
  approvalRequired: boolean;
};

type Product = ProductState & {
  id: string;
  createdAt: string;
  updatedAt: string;
  images: ProductImage[];
};

const inputClass =
  "w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white";

const sectionClass = "space-y-4";

const sectionHeadingClass =
  "text-xs font-semibold uppercase tracking-widest text-gray-400 border-b border-gray-200 dark:border-gray-700 pb-2 mb-4";

const VISIBILITY_CONFIG: Record<Visibility, { label: string; dot: string; badge: string; desc: string }> = {
  live: {
    label: "Live",
    dot: "bg-green-500",
    badge: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400",
    desc: "Visible in customer discovery",
  },
  hidden: {
    label: "Hidden",
    dot: "bg-amber-400",
    badge: "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400",
    desc: "Intentionally hidden from discovery",
  },
  draft: {
    label: "Draft",
    dot: "bg-gray-400",
    badge: "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400",
    desc: "Being prepared, not yet visible",
  },
};

function productToState(p: Product): ProductState {
  return {
    name: p.name,
    category: p.category,
    itemType: p.itemType,
    description: p.description,
    price: p.price,
    costPrice: p.costPrice,
    returnPolicy: p.returnPolicy,
    visibility: p.visibility,
    giftable: p.giftable,
    monthlyGiftLimit: p.monthlyGiftLimit,
    approvalRequired: p.approvalRequired,
  };
}

function statesEqual(a: ProductState, b: ProductState) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [product, setProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductState | null>(null);
  const [saved, setSaved] = useState<ProductState | null>(null); // snapshot on last save/load
  const [images, setImages] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [settingHero, setSettingHero] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/brand/products/${id}`)
      .then(async (res) => {
        if (res.status === 404) { if (!cancelled) setNotFound(true); return null; }
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then((data: (Product & { price: number | null; costPrice: number | null; monthlyGiftLimit: number | null }) | null) => {
        if (cancelled || !data) return;
        const normalized: Product = {
          ...data,
          price: data.price != null ? (data.price / 100).toFixed(2) : "",
          costPrice: data.costPrice != null ? (data.costPrice / 100).toFixed(2) : "",
          monthlyGiftLimit: data.monthlyGiftLimit != null ? String(data.monthlyGiftLimit) : "",
          description: data.description ?? "",
          returnPolicy: data.returnPolicy ?? "",
          giftable: data.giftable ?? true,
          approvalRequired: data.approvalRequired ?? false,
          visibility: data.visibility ?? "live",
        };
        setProduct(normalized);
        setImages(normalized.images ?? []);
        const state = productToState(normalized);
        setForm(state);
        setSaved(state);
      })
      .catch(() => { if (!cancelled) setError("Failed to load catalog item."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  const set = useCallback(<K extends keyof ProductState>(key: K, value: ProductState[K]) => {
    setForm((prev) => prev ? { ...prev, [key]: value } : prev);
  }, []);

  const hasChanges = form && saved ? !statesEqual(form, saved) : false;

  async function handleSave() {
    if (!form) return;
    setSaving(true);
    setError(null);

    const body = {
      name: form.name.trim(),
      category: form.category,
      itemType: form.itemType,
      description: form.description.trim(),
      returnPolicy: form.returnPolicy.trim(),
      visibility: form.visibility,
      giftable: form.giftable,
      approvalRequired: form.approvalRequired,
      price: form.price ? Math.round(parseFloat(form.price) * 100) : null,
      costPrice: form.costPrice ? Math.round(parseFloat(form.costPrice) * 100) : null,
      monthlyGiftLimit: form.monthlyGiftLimit ? parseInt(form.monthlyGiftLimit) : null,
    };

    const res = await fetch(`/api/brand/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to save.");
      setSaving(false);
      return;
    }

    setSaved({ ...form });
    setSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  }

  function handleCancel() {
    if (saved) setForm({ ...saved });
  }

  async function handleDeleteProduct() {
    if (!confirm("Delete this catalog item? This cannot be undone.")) return;
    setDeleting(true);
    setError(null);

    const res = await fetch(`/api/brand/products/${id}`, { method: "DELETE" });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to delete.");
      setDeleting(false);
      return;
    }

    router.push("/brand/products");
  }

  async function handleArchive() {
    if (!form) return;
    setForm((prev) => prev ? { ...prev, visibility: "hidden" } : prev);
    // immediately save
    const body = { visibility: "hidden" };
    await fetch(`/api/brand/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaved((prev) => prev ? { ...prev, visibility: "hidden" } : prev);
    router.refresh();
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>, replaceId?: string) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (replaceId) {
      setReplacingId(replaceId);
    } else {
      setUploading(true);
    }
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    if (replaceId) {
      // Delete old image first, then upload new
      await fetch(`/api/brand/products/images?imageId=${replaceId}`, { method: "DELETE" });
      setImages((prev) => prev.filter((img) => img.id !== replaceId));
    }

    const res = await fetch(`/api/brand/products/images?productId=${id}`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to upload image.");
    } else {
      const image = await res.json();
      setImages((prev) => [...prev, image]);
    }

    setReplacingId(null);
    setUploading(false);
    e.target.value = "";
  }

  async function handleSetHero(imageId: string) {
    setSettingHero(imageId);
    const res = await fetch(`/api/brand/products/images?imageId=${imageId}`, { method: "PUT" });
    if (res.ok) {
      setImages((prev) => prev.map((img) => ({ ...img, hero: img.id === imageId })));
    }
    setSettingHero(null);
  }

  async function handleImageDelete(imageId: string) {
    if (!confirm("Remove this image?")) return;
    const res = await fetch(`/api/brand/products/images?imageId=${imageId}`, { method: "DELETE" });
    if (res.ok) {
      setImages((prev) => prev.filter((img) => img.id !== imageId));
    }
  }

  if (loading) {
    return <div className="max-w-5xl mx-auto px-6 py-10 text-sm text-gray-500 dark:text-gray-400">Loading...</div>;
  }

  if (notFound || !product || !form) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-semibold mb-4">Item not found</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          This catalog item does not exist or does not belong to your brand.
        </p>
        <Link href="/brand/products" className="text-sm underline">← Catalog Items</Link>
      </div>
    );
  }

  const vis = VISIBILITY_CONFIG[form.visibility];
  const heroImage = images.find((i) => i.hero);

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 pb-28">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/brand/products"
          className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1 mb-3"
        >
          ← Catalog Items
        </Link>
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-semibold">Edit Catalog Item</h1>
          {/* Status Banner */}
          <div className="text-right shrink-0">
            <div className="flex items-center justify-end gap-1.5 mb-1">
              <span className={`w-2 h-2 rounded-full ${vis.dot}`} />
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${vis.badge}`}>
                {vis.label}
              </span>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Updated {new Date(product.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Created {new Date(product.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="lg:grid lg:grid-cols-3 lg:gap-8 items-start">
        {/* ── Left: Form ───────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-8">

          {/* Basic Information */}
          <section className={sectionClass}>
            <h2 className={sectionHeadingClass}>Basic Information</h2>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Name</label>
              <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)} className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Category</label>
                <select value={form.category} onChange={(e) => set("category", e.target.value)} className={inputClass}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Type</label>
                <select value={form.itemType} onChange={(e) => set("itemType", e.target.value)} className={inputClass}>
                  <option value="gift">Gift</option>
                  <option value="purchase">Purchase</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Description</label>
              <textarea rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} className={inputClass} />
            </div>
          </section>

          {/* Pricing */}
          <section className={sectionClass}>
            <h2 className={sectionHeadingClass}>Pricing</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Retail Value (USD)</label>
                <input type="number" step="0.01" min="0" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="0.00" className={inputClass} />
                <p className="text-xs text-gray-400 mt-1">Shown to customers</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Internal Cost (USD)</label>
                <input type="number" step="0.01" min="0" value={form.costPrice} onChange={(e) => set("costPrice", e.target.value)} placeholder="0.00" className={inputClass} />
                <p className="text-xs text-gray-400 mt-1">Used for gifting and reporting</p>
              </div>
            </div>
          </section>

          {/* Gift Settings */}
          <section className={sectionClass}>
            <h2 className={sectionHeadingClass}>Gift Settings</h2>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={form.giftable}
                onChange={(e) => set("giftable", e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm text-gray-900 dark:text-white">Available for gifting</span>
            </label>
            {form.giftable && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Monthly gift limit <span className="text-gray-300 dark:text-gray-600">(leave blank for unlimited)</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.monthlyGiftLimit}
                    onChange={(e) => set("monthlyGiftLimit", e.target.value)}
                    placeholder="Unlimited"
                    className={inputClass}
                  />
                </div>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.approvalRequired}
                    onChange={(e) => set("approvalRequired", e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm text-gray-900 dark:text-white">Approval required per gift</span>
                </label>
              </>
            )}
          </section>

          {/* Visibility */}
          <section className={sectionClass}>
            <h2 className={sectionHeadingClass}>Visibility</h2>
            <div className="flex gap-3">
              {(["draft", "hidden", "live"] as Visibility[]).map((v) => {
                const cfg = VISIBILITY_CONFIG[v];
                const active = form.visibility === v;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => set("visibility", v)}
                    className={`flex-1 flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-3 transition-colors text-sm font-medium ${
                      active
                        ? "border-black dark:border-white bg-gray-50 dark:bg-gray-800"
                        : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60"
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                    <span className="text-gray-900 dark:text-white">{cfg.label}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 font-normal text-center leading-tight">
                      {cfg.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Images */}
          <section className={sectionClass}>
            <h2 className={sectionHeadingClass}>Images</h2>
            {images.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-3">
                {images.map((img) => (
                  <div key={img.id} className="relative group aspect-square">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url}
                      alt=""
                      className={`w-full h-full object-cover rounded-xl border-2 transition-opacity ${
                        img.hero ? "border-black dark:border-white" : "border-transparent"
                      } ${settingHero === img.id || replacingId === img.id ? "opacity-50" : ""}`}
                    />
                    {img.hero && (
                      <span className="absolute top-1.5 left-1.5 bg-black dark:bg-white dark:text-black text-white text-xs px-1.5 py-0.5 rounded font-medium">
                        Hero
                      </span>
                    )}
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-2">
                      {!img.hero && (
                        <button
                          type="button"
                          disabled={settingHero !== null}
                          onClick={() => handleSetHero(img.id)}
                          className="w-full bg-white/90 text-black text-xs px-2 py-1 rounded-md hover:bg-white disabled:opacity-50"
                        >
                          Set Hero
                        </button>
                      )}
                      <label className="w-full bg-white/90 text-black text-xs px-2 py-1 rounded-md hover:bg-white cursor-pointer text-center">
                        Replace
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={(e) => handleImageUpload(e, img.id)}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => handleImageDelete(img.id)}
                        className="w-full bg-red-500/90 text-white text-xs px-2 py-1 rounded-md hover:bg-red-500"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <label className="inline-flex items-center gap-2 cursor-pointer border border-gray-200 dark:border-gray-700 text-sm px-4 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors">
              <span className="text-gray-600 dark:text-gray-400">+</span>
              <span>{uploading ? "Uploading..." : "Upload Images"}</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => handleImageUpload(e)}
                disabled={uploading}
                className="hidden"
              />
            </label>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              JPEG, PNG, or WebP · Max 10 MB · First upload becomes the hero image
            </p>
          </section>

          {/* Inventory (placeholder) */}
          <section className={sectionClass}>
            <h2 className={sectionHeadingClass}>
              Inventory
              <span className="ml-2 text-xs font-normal normal-case tracking-normal text-gray-300 dark:text-gray-600">
                Coming soon
              </span>
            </h2>
            <div className="grid grid-cols-2 gap-3 opacity-50 pointer-events-none">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">SKU</label>
                <input type="text" disabled placeholder="e.g. SHT-BLK-M" className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Quantity Available</label>
                <input type="number" disabled placeholder="0" className={inputClass} />
              </div>
            </div>
          </section>

          {/* Danger Zone */}
          <section className="border border-red-200 dark:border-red-900/50 rounded-xl p-5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-red-500 mb-4">Danger Zone</h2>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleArchive}
                className="border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm px-4 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                Archive (hide from discovery)
              </button>
              <button
                type="button"
                onClick={handleDeleteProduct}
                disabled={deleting}
                className="bg-red-600 text-white text-sm px-4 py-2 rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleting ? "Deleting..." : "Delete permanently"}
              </button>
            </div>
          </section>
        </div>

        {/* ── Right: Preview ──────────────────────────────────────────────── */}
        <div className="hidden lg:block lg:col-span-1">
          <div className="sticky top-6 space-y-4">
            {/* Product card preview */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-900">
              {/* Hero image */}
              <div className="aspect-square bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                {heroImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={heroImage.url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs text-gray-400 dark:text-gray-500">No image</span>
                )}
              </div>
              {/* Card body */}
              <div className="p-3 space-y-1.5">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {form.name || "Product name"}
                </p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 capitalize">
                    {form.itemType}
                  </span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 capitalize">
                    {form.category}
                  </span>
                </div>
                {form.price && (
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    ${parseFloat(form.price).toFixed(2)}
                  </p>
                )}
                <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${vis.badge}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${vis.dot}`} />
                  {vis.label}
                </span>
              </div>
            </div>
            <p className="text-xs text-center text-gray-400 dark:text-gray-500">
              Customer card preview
            </p>
          </div>
        </div>
      </div>

      {/* ── Sticky footer (unsaved changes) ─────────────────────────────── */}
      {hasChanges && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-6 py-4 flex items-center justify-between z-20 shadow-lg">
          <p className="text-sm text-gray-500 dark:text-gray-400">Unsaved changes</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              className="border border-gray-200 dark:border-gray-700 text-sm px-4 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/60 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
              className={`text-sm px-5 py-2 rounded-xl font-medium transition-colors disabled:opacity-50 ${
                saveSuccess
                  ? "bg-green-500 text-white"
                  : "bg-black dark:bg-white dark:text-black text-white hover:bg-gray-800 dark:hover:bg-gray-200"
              }`}
            >
              {saveSuccess ? "Saved ✓" : saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
