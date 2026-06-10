"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type RowResult = {
  row: number;
  status: "imported" | "error";
  name?: string;
  error?: string;
};

type ImportResponse =
  | { imported: number; errors: number; results: RowResult[] }
  | { error: string; errors?: { row: number; issues: unknown }[] };

const CSV_TEMPLATE = `name,category,item_type,description,price,cost_price,return_policy
Navy Blazer,business,purchase,A slim-fit navy wool blazer,395,180,Returns accepted within 14 days
White Linen Shirt,casual,gift,Lightweight summer shirt,,,`;

export default function ImportProductsPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResponse | null>(null);

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "styledeck-products-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setResult(null);

    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch("/api/brand/products/import", { method: "POST", body: fd });
    const data = await res.json();
    setResult(data);
    setLoading(false);
  }

  const success = result && "imported" in result;

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/brand/products" className="text-sm text-gray-400 hover:text-black">
          ← Products
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-semibold">Import from CSV</h1>
      </div>

      {/* Format guide */}
      <div className="bg-gray-50 rounded-xl p-5 mb-8 text-sm">
        <p className="font-medium mb-2">Required columns</p>
        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-gray-600">
          {[
            ["name", "Product name (required)"],
            ["category", "casual / business / formal / custom"],
            ["item_type", "gift or purchase"],
            ["description", "Optional product description"],
            ["price", "Retail price in dollars (e.g. 395)"],
            ["cost_price", "Cost price in dollars (hidden from customers)"],
            ["return_policy", "Optional return policy text"],
          ].map(([col, desc]) => (
            <div key={col} className="contents">
              <span className="font-mono text-xs text-gray-800">{col}</span>
              <span className="text-xs text-gray-500">{desc}</span>
            </div>
          ))}
        </div>
        <button
          onClick={downloadTemplate}
          className="mt-4 text-xs text-black underline underline-offset-2"
        >
          Download template CSV
        </button>
      </div>

      {/* Upload form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div
          className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          {file ? (
            <div>
              <p className="font-medium text-sm">{file.name}</p>
              <p className="text-xs text-gray-400 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          ) : (
            <div>
              <p className="text-3xl mb-3 opacity-30">↑</p>
              <p className="text-sm text-gray-500">Click to select a CSV file</p>
              <p className="text-xs text-gray-400 mt-1">Max 500 rows</p>
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setResult(null);
            }}
          />
        </div>

        <button
          type="submit"
          disabled={!file || loading}
          className="w-full bg-black text-white rounded-lg py-3 text-sm font-medium disabled:opacity-40 hover:bg-gray-800 transition-colors"
        >
          {loading ? "Importing…" : "Import products"}
        </button>
      </form>

      {/* Results */}
      {result && (
        <div className="mt-8">
          {"error" in result && !("results" in result) ? (
            <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
              {result.error}
            </div>
          ) : success ? (
            <>
              <div
                className={`rounded-xl p-4 mb-4 text-sm ${
                  result.errors === 0
                    ? "bg-green-50 border border-green-200 text-green-800"
                    : "bg-amber-50 border border-amber-200 text-amber-800"
                }`}
              >
                <p className="font-medium">
                  {result.imported} product{result.imported !== 1 ? "s" : ""} imported
                  {result.errors > 0 && `, ${result.errors} row${result.errors !== 1 ? "s" : ""} skipped`}
                </p>
                {result.imported > 0 && (
                  <button
                    onClick={() => router.push("/brand/products")}
                    className="mt-2 text-xs underline underline-offset-2"
                  >
                    View all products →
                  </button>
                )}
              </div>

              {result.results.filter((r) => r.status === "error").length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Skipped rows
                  </p>
                  {result.results
                    .filter((r) => r.status === "error")
                    .map((r) => (
                      <div
                        key={r.row}
                        className="text-xs border border-red-100 bg-red-50 rounded-lg px-3 py-2 flex gap-3"
                      >
                        <span className="text-red-400 shrink-0">Row {r.row}</span>
                        <span className="text-red-600">{r.error}</span>
                      </div>
                    ))}
                </div>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
