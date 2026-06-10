"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CATEGORIES = ["casual", "business", "formal", "custom"] as const;

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

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
    router.push(`/brand/products/${id}`);
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-8">New product</h1>

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
          <Field label="Cost price (USD)" hint="Internal only — never shown to customers">
            <input name="costPrice" type="number" step="0.01" min="0" className={inputClass} placeholder="0.00" />
          </Field>
        </div>

        <Field label="Description">
          <textarea name="description" rows={4} className={inputClass} />
        </Field>

        <Field label="Return policy">
          <textarea name="returnPolicy" rows={3} className={inputClass} />
        </Field>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-black text-white text-sm px-5 py-2 rounded-md hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? "Creating…" : "Create product"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="border border-gray-300 text-sm px-5 py-2 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
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
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}

const inputClass =
  "w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black";
