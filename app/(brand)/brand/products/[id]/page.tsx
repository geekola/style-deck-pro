"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

const CATEGORIES = ["casual", "business", "formal", "custom"] as const;

type ProductImage = { id: string; url: string; hero: boolean; displayOrder: number };

type Product = {
  id: string;
  name: string;
  category: string;
  itemType: string;
  description: string | null;
  costPrice: number | null;
  price: number | null;
  returnPolicy: string | null;
  active: boolean;
  images: ProductImage[];
};

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [product, setProduct] = useState<Product | null>(null);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/brand/products/${id}`)
      .then(async (res) => {
        if (res.status === 404) {
          if (!cancelled) setNotFound(true);
          return null;
        }
        if (!res.ok) throw new Error("Failed to load product");
        return res.json();
      })
      .then((data: Product | null) => {
        if (cancelled || !data) return;
        setProduct(data);
        setImages(data.images ?? []);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load product.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const price = form.get("price") as string;
    const costPrice = form.get("costPrice") as string;

    const body = {
      name: form.get("name"),
      category: form.get("category"),
      itemType: form.get("itemType"),
      description: (form.get("description") as string) ?? "",
      price: price ? Math.round(parseFloat(price) * 100) : undefined,
      costPrice: costPrice ? Math.round(parseFloat(costPrice) * 100) : undefined,
      returnPolicy: (form.get("returnPolicy") as string) ?? "",
      active: form.get("active") === "on",
    };

    const res = await fetch(`/api/brand/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to save product.");
      setSaving(false);
      return;
    }

    router.push("/brand/products");
  }

  async function handleDeleteProduct() {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    setDeleting(true);
    setError(null);

    const res = await fetch(`/api/brand/products/${id}`, { method: "DELETE" });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to delete product.");
      setDeleting(false);
      return;
    }

    router.push("/brand/products");
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`/api/brand/products/images?productId=${id}`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to upload image.");
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const image = await res.json();
    setImages((prev) => [...prev, image]);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleImageDelete(imageId: string) {
    if (!confirm("Remove this image?")) return;
    setError(null);

    const res = await fetch(`/api/brand/products/images?imageId=${imageId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to remove image.");
      return;
    }

    setImages((prev) => prev.filter((img) => img.id !== imageId));
  }

  if (loading) {
    return <div className="max-w-2xl mx-auto px-6 py-10 text-sm text-gray-500 dark:text-gray-400">Loading…</div>;
  }

  if (notFound || !product) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-semibold mb-4">Product not found</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          This product doesn&apos;t exist or doesn&apos;t belong to your brand.
        </p>
        <Link href="/brand/products" className="text-sm underline">
          Back to products
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">Edit product</h1>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
            product.active
              ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400"
              : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
          }`}
        >
          {product.active ? "Active" : "Inactive"}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Field label="Product name">
          <input name="name" required defaultValue={product.name} className={inputClass} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Category">
            <select name="category" required defaultValue={product.category} className={inputClass}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </Field>

          <Field label="Type">
            <select name="itemType" required defaultValue={product.itemType} className={inputClass}>
              <option value="gift">Gift</option>
              <option value="purchase">Purchase</option>
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Price (USD)" hint="Leave blank for gift-only products">
            <input
              name="price"
              type="number"
              step="0.01"
              min="0"
              defaultValue={product.price != null ? (product.price / 100).toFixed(2) : ""}
              className={inputClass}
              placeholder="0.00"
            />
          </Field>
          <Field label="Cost price (USD)" hint="Internal only — never shown to customers">
            <input
              name="costPrice"
              type="number"
              step="0.01"
              min="0"
              defaultValue={product.costPrice != null ? (product.costPrice / 100).toFixed(2) : ""}
              className={inputClass}
              placeholder="0.00"
            />
          </Field>
        </div>

        <Field label="Description">
          <textarea name="description" rows={4} defaultValue={product.description ?? ""} className={inputClass} />
        </Field>

        <Field label="Return policy">
          <textarea name="returnPolicy" rows={3} defaultValue={product.returnPolicy ?? ""} className={inputClass} />
        </Field>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={product.active} className="rounded" />
          Active (visible in customer discovery)
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-black dark:bg-white dark:text-black text-white text-sm px-5 py-2 rounded-md hover:bg-gray-800 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/brand/products")}
            className="border border-gray-300 dark:border-gray-600 text-sm px-5 py-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/60 dark:bg-gray-900"
          >
            Cancel
          </button>
        </div>
      </form>

      <div className="mt-10 border-t border-gray-200 dark:border-gray-700 pt-8">
        <h2 className="text-sm font-medium mb-3">Images</h2>

        {images.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            {images.map((img) => (
              <div key={img.id} className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt=""
                  className="w-full h-28 object-cover rounded-md border border-gray-200 dark:border-gray-700"
                />
                {img.hero && (
                  <span className="absolute top-1 left-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                    Hero
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleImageDelete(img.id)}
                  className="absolute top-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        <label className="inline-block">
          <span
            className={`border border-gray-300 dark:border-gray-600 text-sm px-4 py-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/60 dark:bg-gray-900 cursor-pointer inline-block ${
              uploading ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            {uploading ? "Uploading…" : "Add image"}
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImageUpload}
            className="hidden"
            disabled={uploading}
          />
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">JPEG, PNG, or WebP. Max 10MB. First image is the hero image.</p>
      </div>

      <div className="mt-10 border-t border-gray-200 dark:border-gray-700 pt-8">
        <h2 className="text-sm font-medium mb-3 text-red-600">Danger zone</h2>
        <button
          type="button"
          onClick={handleDeleteProduct}
          disabled={deleting}
          className="border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 text-sm px-4 py-2 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
        >
          {deleting ? "Deleting…" : "Delete product"}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-600 mb-1">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}

const inputClass =
  "w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white";
