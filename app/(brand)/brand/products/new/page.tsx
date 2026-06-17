"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const CATEGORIES = ["casual", "business", "formal", "custom"] as const;

type StagedFile = { file: File; previewUrl: string };

export default function NewProductPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    const MAX = 10 * 1024 * 1024;

    const valid = files.filter((f) => allowed.includes(f.type) && f.size <= MAX);
    const invalid = files.filter((f) => !allowed.includes(f.type) || f.size > MAX);

    if (invalid.length > 0) {
      setError(`${invalid.length} file(s) skipped -- must be JPEG, PNG, or WebP under 10MB.`);
    } else {
      setError(null);
    }

    setStagedFiles((prev) => [
      ...prev,
      ...valid.map((f) => ({ file: f, previewUrl: URL.createObjectURL(f) })),
    ]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeStaged(index: number) {
    setStagedFiles((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setUploadProgress(null);

    const form = new FormData(e.currentTarget);
    const price = form.get("price") as string;
    const costPrice = form.get("costPrice") as string;

    const body = {
      name: form.get("name"),
      category: form.get("category"),
      itemType: form.get("itemType"),
      description: form.get("description") || undefined,
      price: price ? Math.round(parseFloat(price) * 100) : undefined,
      costPrice: costPrice ? Math.round(parseFloat(costPrice) * 100) : undefined,
      returnPolicy: form.get("returnPolicy") || undefined,
    };

    const res = await fetch("/api/brand/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to create product.");
      setLoading(false);
      return;
    }

    const { id } = await res.json();

    for (let i = 0; i < stagedFiles.length; i++) {
      setUploadProgress(`Uploading image ${i + 1} of ${stagedFiles.length}...`);
      const fd = new FormData();
      fd.append("file", stagedFiles[i].file);
      await fetch(`/api/brand/products/images?productId=${id}`, {
        method: "POST",
        body: fd,
      });
    }

    router.push(`/brand/products/${id}`);
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="mb-8">
        <Link
          href="/brand/products"
          className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1 mb-3"
        >
          <span>&#8592;</span> Catalog Items
        </Link>
        <h1 className="text-2xl font-semibold">New product</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Field label="Product name">
          <input name="name" required className={inputClass} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Category">
            <select name="category" required className={inputClass}>
              <option value="">Select</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </Field>

          <Field label="Type">
            <select name="itemType" required className={inputClass}>
              <option value="">Select</option>
              <option value="gift">Gift</option>
              <option value="purchase">Purchase</option>
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Price (USD)" hint="Leave blank for gift-only products">
            <input name="price" type="number" step="0.01" min="0" className={inputClass} placeholder="0.00" />
          </Field>
          <Field label="Cost price (USD)" hint="Internal only, never shown to customers">
            <input name="costPrice" type="number" step="0.01" min="0" className={inputClass} placeholder="0.00" />
          </Field>
        </div>

        <Field label="Description">
          <textarea name="description" rows={4} className={inputClass} />
        </Field>

        <Field label="Return policy">
          <textarea name="returnPolicy" rows={3} className={inputClass} />
        </Field>

        <div>
          <p className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Images</p>

          {stagedFiles.length > 0 && (
            <div className="grid grid-cols-4 gap-2 mb-3">
              {stagedFiles.map((sf, i) => (
                <div key={i} className="relative group">
                  <img
                    src={sf.previewUrl}
                    alt=""
                    className="w-full h-20 object-cover rounded-md border border-gray-200 dark:border-gray-700"
                  />
                  {i === 0 && (
                    <span className="absolute top-1 left-1 bg-black/70 text-white text-xs px-1 py-0.5 rounded">
                      Hero
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeStaged(i)}
                    className="absolute top-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          <label className="inline-block">
            <span className="border border-gray-300 dark:border-gray-600 text-sm px-4 py-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/60 dark:bg-gray-900 cursor-pointer inline-block">
              Add images
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            JPEG, PNG, or WebP. Max 10MB each. First image becomes the hero.
          </p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {uploadProgress && <p className="text-sm text-gray-500 dark:text-gray-400">{uploadProgress}</p>}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-black dark:bg-white dark:text-black text-white text-sm px-5 py-2 rounded-md hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? (uploadProgress ?? "Creating...") : "Create product"}
          </button>
          <Link
            href="/brand/products"
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            Cancel
          </Link>
        </div>
      </form>
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
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

const inputClass =
  "w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white";
