"use client";

import { useEffect, useState } from "react";

type CatalogItem = {
  id: string;
  productName: string;
  modelNo: string;
  sku: string;
  size: string;
  unitCost: number;
  sellingPrice?: number;
  notes?: string;
};

const sizeOptions = ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45"];

export default function AddItemsPage() {
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);

  const [productName, setProductName] = useState("");
  const [modelNo, setModelNo] = useState("");
  const [skuPrefix, setSkuPrefix] = useState("");
  const [size, setSize] = useState("36");
  const [unitCost, setUnitCost] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [notes, setNotes] = useState("");

  const [bulkSizes, setBulkSizes] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    loadCatalog();
    window.addEventListener("pageshow", loadCatalog);

    return () => {
      window.removeEventListener("pageshow", loadCatalog);
    };
  }, []);

  function loadCatalog() {
    const saved = localStorage.getItem("halfi_product_catalog");

    try {
      setCatalogItems(saved ? JSON.parse(saved) : []);
    } catch {
      setCatalogItems([]);
    }
  }

  function saveCatalog(updated: CatalogItem[]) {
    setCatalogItems(updated);
    localStorage.setItem("halfi_product_catalog", JSON.stringify(updated));
  }

  function makeSku(prefix: string, itemSize: string) {
    const cleaned = prefix.trim().toUpperCase();

    if (!cleaned) return "";

    return `${cleaned}-${itemSize}`;
  }

  function resetForm() {
    setProductName("");
    setModelNo("");
    setSkuPrefix("");
    setSize("36");
    setUnitCost("");
    setSellingPrice("");
    setNotes("");
    setBulkSizes(true);
    setEditingId(null);
  }

  function saveItem() {
    if (!productName.trim()) {
      alert("Product name is required.");
      return;
    }

    if (!modelNo.trim()) {
      alert("Model number is required.");
      return;
    }

    if (!skuPrefix.trim()) {
      alert("SKU prefix is required. Example: LF-BLK");
      return;
    }

    const cost = Number(unitCost || 0);
    const price = Number(sellingPrice || 0);

    if (cost < 0 || price < 0) {
      alert("Cost and selling price cannot be negative.");
      return;
    }

    if (editingId) {
      const updated = catalogItems.map((item) =>
        item.id === editingId
          ? {
              ...item,
              productName,
              modelNo,
              sku: makeSku(skuPrefix, size),
              size,
              unitCost: cost,
              sellingPrice: price,
              notes,
            }
          : item
      );

      saveCatalog(updated);
      resetForm();
      alert("Catalog item updated.");
      return;
    }

    const sizesToCreate = bulkSizes ? sizeOptions : [size];

    const newItems: CatalogItem[] = sizesToCreate.map((itemSize) => ({
      id: `CAT-${Date.now()}-${itemSize}-${Math.random()}`,
      productName,
      modelNo,
      sku: makeSku(skuPrefix, itemSize),
      size: itemSize,
      unitCost: cost,
      sellingPrice: price,
      notes,
    }));

    const existingKeys = new Set(
      catalogItems.map(
        (item) =>
          `${item.productName.toLowerCase()}|${item.modelNo.toLowerCase()}|${item.size}`
      )
    );

    const filteredNewItems = newItems.filter(
      (item) =>
        !existingKeys.has(
          `${item.productName.toLowerCase()}|${item.modelNo.toLowerCase()}|${item.size}`
        )
    );

    if (filteredNewItems.length === 0) {
      alert("These catalog items already exist.");
      return;
    }

    saveCatalog([...filteredNewItems, ...catalogItems]);
    resetForm();

    alert(
      bulkSizes
        ? `Created ${filteredNewItems.length} sizes.`
        : "Catalog item created."
    );
  }

  function editItem(item: CatalogItem) {
    const skuParts = item.sku.split("-");
    const prefix =
      skuParts.length > 1 ? skuParts.slice(0, -1).join("-") : item.sku;

    setEditingId(item.id);
    setProductName(item.productName);
    setModelNo(item.modelNo);
    setSkuPrefix(prefix);
    setSize(item.size);
    setUnitCost(String(item.unitCost || 0));
    setSellingPrice(String(item.sellingPrice || 0));
    setNotes(item.notes || "");
    setBulkSizes(false);
  }

  function deleteItem(id: string) {
    if (!confirm("Delete this catalog item?")) return;

    saveCatalog(catalogItems.filter((item) => item.id !== id));

    if (editingId === id) resetForm();
  }

  function deleteAllCatalog() {
    if (!confirm("Delete ALL catalog items?")) return;

    saveCatalog([]);
    resetForm();
  }

  return (
    <main className="min-h-screen bg-zinc-100 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-3xl bg-black p-8 text-white">
          <h1 className="text-4xl font-black tracking-widest text-amber-300">
            ADD ITEM
          </h1>
          <p className="mt-2 text-zinc-300">
            Create product catalog items used in manual purchase orders.
          </p>
        </div>

        <div className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-bold">
              {editingId ? "Edit Catalog Item" : "Create Catalog Item"}
            </h2>

            {catalogItems.length > 0 && (
              <button
                type="button"
                onClick={deleteAllCatalog}
                className="rounded-xl bg-red-600 px-4 py-2 font-bold text-white"
              >
                Delete All Catalog
              </button>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-bold">Product Name</label>
              <input
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Loafer Black"
                className="mt-2 w-full rounded-xl border px-4 py-3"
              />
            </div>

            <div>
              <label className="text-sm font-bold">Model No.</label>
              <input
                value={modelNo}
                onChange={(e) => setModelNo(e.target.value)}
                placeholder="LF100"
                className="mt-2 w-full rounded-xl border px-4 py-3"
              />
            </div>

            <div>
              <label className="text-sm font-bold">SKU Prefix</label>
              <input
                value={skuPrefix}
                onChange={(e) => setSkuPrefix(e.target.value)}
                placeholder="LF-BLK"
                className="mt-2 w-full rounded-xl border px-4 py-3"
              />
              <p className="mt-1 text-xs text-zinc-500">
                Size gets added automatically, example: LF-BLK-36
              </p>
            </div>

            <div>
              <label className="text-sm font-bold">Size</label>
              <select
                value={size}
                onChange={(e) => setSize(e.target.value)}
                disabled={bulkSizes && !editingId}
                className="mt-2 w-full rounded-xl border px-4 py-3 disabled:bg-zinc-100"
              >
                {sizeOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-bold">Unit Cost</label>
              <input
                type="number"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                placeholder="26.70"
                className="mt-2 w-full rounded-xl border px-4 py-3"
              />
            </div>

            <div>
              <label className="text-sm font-bold">Selling Price</label>
              <input
                type="number"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                placeholder="85.00"
                className="mt-2 w-full rounded-xl border px-4 py-3"
              />
            </div>

            <div className="md:col-span-3">
              <label className="text-sm font-bold">Notes</label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes"
                className="mt-2 w-full rounded-xl border px-4 py-3"
              />
            </div>
          </div>

          {!editingId && (
            <label className="mt-5 flex items-center gap-3 font-bold">
              <input
                type="checkbox"
                checked={bulkSizes}
                onChange={(e) => setBulkSizes(e.target.checked)}
              />
              Create all sizes 36-45
            </label>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={saveItem}
              className="rounded-xl bg-black px-5 py-3 font-bold text-amber-300"
            >
              {editingId ? "Update Item" : "Save Item"}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border px-5 py-3 font-bold"
              >
                Cancel Edit
              </button>
            )}
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-2xl font-bold">Product Catalog</h2>

          {catalogItems.length === 0 ? (
            <p className="text-zinc-500">
              No catalog items yet. Create an item above, then it will appear in manual purchase orders.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className="bg-zinc-100 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="p-4">Product</th>
                    <th className="p-4">Model No.</th>
                    <th className="p-4">SKU</th>
                    <th className="p-4">Size</th>
                    <th className="p-4">Unit Cost</th>
                    <th className="p-4">Selling Price</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {catalogItems.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="p-4 font-bold">{item.productName}</td>
                      <td className="p-4">{item.modelNo}</td>
                      <td className="p-4 font-bold">{item.sku}</td>
                      <td className="p-4">{item.size}</td>
                      <td className="p-4">${Number(item.unitCost || 0)}</td>
                      <td className="p-4">
                        ${Number(item.sellingPrice || 0)}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => editItem(item)}
                            className="rounded-xl bg-amber-400 px-4 py-2 font-bold text-black"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteItem(item.id)}
                            className="rounded-xl bg-red-600 px-4 py-2 font-bold text-white"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
