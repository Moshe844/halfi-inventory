"use client";

import { useState } from "react";

type ImportedItem = {
  id: string;
  productName: string;
  modelNo: string;
  size: string;
  pendingQty: number;
  inStockQty: number;
  unitCost: number;
  status: "Pending";
};

export default function ImportPdfPage() {
  const [items, setItems] = useState<ImportedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function uploadPdf(file: File) {
    setError("");
    setItems([]);
    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/import-pdf", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Upload failed.");
        return;
      }

      setItems(data.items || []);

      if (!data.items || data.items.length === 0) {
        setError("PDF was read, but no inventory rows were detected.");
      }
    } catch {
      setError("Something went wrong while uploading the PDF.");
    } finally {
      setLoading(false);
    }
  }

  function saveToInventory() {
    localStorage.setItem("halfi_items", JSON.stringify(items));
    alert("PDF imported to inventory as pending.");
  }

  return (
    <main className="min-h-screen bg-zinc-100 p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 rounded-3xl bg-black p-8 text-white">
          <h1 className="text-3xl font-black text-amber-300">Import PDF</h1>
          <p className="mt-2 text-zinc-300">
            Choose your vendor PDF. It will upload and read automatically.
          </p>
        </div>

        <div className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              uploadPdf(file);
            }}
            className="mb-4 block"
          />

          {loading && (
            <p className="rounded-xl bg-amber-100 p-3 font-semibold text-amber-800">
              Reading PDF...
            </p>
          )}

          {error && (
            <p className="mt-4 rounded-xl bg-red-100 p-3 font-semibold text-red-700">
              {error}
            </p>
          )}
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-bold">Imported Items</h2>

          {items.length === 0 ? (
            <p className="text-zinc-500">No PDF imported yet.</p>
          ) : (
            <>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2">Product</th>
                    <th>Model</th>
                    <th>Size</th>
                    <th>Pending Qty</th>
                    <th>In Stock</th>
                    <th>Unit Cost</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="py-2">{item.productName}</td>
                      <td>{item.modelNo}</td>
                      <td>{item.size}</td>
                      <td>{item.pendingQty}</td>
                      <td>{item.inStockQty}</td>
                      <td>${item.unitCost}</td>
                      <td>{item.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <button
                onClick={saveToInventory}
                className="mt-6 rounded-xl bg-black px-5 py-3 font-bold text-amber-300"
              >
                Save to Inventory
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}