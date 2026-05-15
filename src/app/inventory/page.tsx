"use client";

import { useEffect, useMemo, useState } from "react";

type Status = "In Stock" | "Low Stock" | "Out of Stock";

type Item = {
  id: string;
  productName?: string;
  style?: string;
  modelNo?: string;
  sku?: string;
  size: string;
  quantity?: number;
  pendingQty?: number;
  inStockQty?: number;
  unitCost?: number;
  sellingPrice?: number;
  status?: string;
};

function getQty(item: Item) {
  return Number(item.quantity ?? item.pendingQty ?? item.inStockQty ?? 0);
}

function getStatus(qty: number): Status {
  if (qty <= 0) return "Out of Stock";
  if (qty <= 5) return "Low Stock";
  return "In Stock";
}

function statusClass(status: Status) {
  if (status === "In Stock") return "bg-green-100 text-green-800";
  if (status === "Low Stock") return "bg-yellow-100 text-yellow-800";
  return "bg-red-100 text-red-800";
}

export default function InventoryPage() {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("halfi_items");

    if (saved) {
      setItems(JSON.parse(saved));
    }
  }, []);

  const totalQty = useMemo(
    () => items.reduce((sum, item) => sum + getQty(item), 0),
    [items]
  );

  const totalValue = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + getQty(item) * Number(item.unitCost ?? 0),
        0
      ),
    [items]
  );

  const totalRetailValue = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum + getQty(item) * Number(item.sellingPrice ?? item.unitCost ?? 0),
        0
      ),
    [items]
  );

  function saveItems(updated: Item[]) {
    setItems(updated);
    localStorage.setItem("halfi_items", JSON.stringify(updated));
  }

  function updateQty(id: string, qty: number) {
    const updated = items.map((item) =>
      item.id === id
        ? {
            ...item,
            quantity: qty,
            pendingQty: qty,
            inStockQty: qty,
            status: getStatus(qty),
          }
        : item
    );

    saveItems(updated);
  }

  function updateModelNo(id: string, modelNo: string) {
    const updated = items.map((item) =>
      item.id === id
        ? {
            ...item,
            modelNo: modelNo.trim(),
          }
        : item
    );

    saveItems(updated);
  }

  function updateSellingPrice(id: string, sellingPrice: number) {
    const updated = items.map((item) =>
      item.id === id
        ? {
            ...item,
            sellingPrice,
          }
        : item
    );

    saveItems(updated);
  }

  function clearInventory() {
    localStorage.removeItem("halfi_items");
    setItems([]);
  }

  return (
    <main className="min-h-screen bg-zinc-100 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-3xl bg-black p-8 text-white">
          <h1 className="text-4xl font-black tracking-widest text-amber-300">
            HALFI INVENTORY
          </h1>

          <p className="mt-2 text-zinc-300">
            Imported from vendor PDF. Quantity and status update automatically.
          </p>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-sm text-zinc-500">Total SKUs</p>

            <p className="mt-1 text-3xl font-bold">{items.length}</p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-sm text-zinc-500">Total Pairs</p>

            <p className="mt-1 text-3xl font-bold">{totalQty}</p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-sm text-zinc-500">Inventory Cost Value</p>

            <p className="mt-1 text-3xl font-bold">
              ${totalValue.toLocaleString()}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-sm text-zinc-500">Inventory Retail Value</p>

            <p className="mt-1 text-3xl font-bold">
              ${totalRetailValue.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Inventory Items</h2>

              <p className="text-zinc-500">
                0 = Out of Stock, 1–5 = Low Stock, 6+ = In Stock.
              </p>
            </div>

            <button
              onClick={clearInventory}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white"
            >
              Clear Inventory
            </button>
          </div>

          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-10 text-center">
              <h3 className="text-xl font-bold">No inventory yet</h3>

              <p className="mt-2 text-zinc-500">
                Go to Import PDF and upload your vendor PO.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border">
              <table className="w-full min-w-[1150px] text-left text-sm">
                <thead className="bg-zinc-100 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="p-4">Product</th>
                    <th className="p-4">Model No.</th>
                    <th className="p-4">SKU</th>
                    <th className="p-4">Size</th>
                    <th className="p-4">Qty</th>
                    <th className="p-4">Unit Cost</th>
                    <th className="p-4">Customer Price</th>
                    <th className="p-4">Total Cost</th>
                    <th className="p-4">Retail Value</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Update Qty</th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((item) => {
                    const qty = getQty(item);
                    const status = getStatus(qty);
                    const product = item.productName || item.style || "";
                    const cost = Number(item.unitCost ?? 0);
                    const salePrice = Number(item.sellingPrice ?? item.unitCost ?? 0);

                    return (
                      <tr key={item.id} className="border-t">
                        <td className="p-4 font-bold">{product}</td>

                        <td className="p-4">
                          <input
                            type="text"
                            defaultValue={item.modelNo || ""}
                            placeholder="Model No."
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();

                                updateModelNo(
                                  item.id,
                                  e.currentTarget.value
                                );

                                e.currentTarget.blur();
                              }
                            }}
                            onBlur={(e) =>
                              updateModelNo(item.id, e.target.value)
                            }
                            className="w-36 rounded-xl border px-3 py-2"
                          />
                        </td>

                        <td className="p-4">{item.sku || "-"}</td>

                        <td className="p-4 font-semibold">{item.size}</td>

                        <td className="p-4 text-lg font-black">{qty}</td>

                        <td className="p-4">${cost.toFixed(2)}</td>

                        <td className="p-4">
                          <input
                            type="number"
                            defaultValue={salePrice}
                            onBlur={(e) =>
                              updateSellingPrice(
                                item.id,
                                Number(e.target.value)
                              )
                            }
                            className="w-24 rounded-xl border px-3 py-2"
                          />
                        </td>

                        <td className="p-4 font-semibold">
                          ${(qty * cost).toLocaleString()}
                        </td>

                        <td className="p-4 font-semibold">
                          ${(qty * salePrice).toLocaleString()}
                        </td>

                        <td className="p-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(
                              status
                            )}`}
                          >
                            {status}
                          </span>
                        </td>

                        <td className="p-4">
                          <input
                            type="number"
                            defaultValue={qty}
                            onBlur={(e) =>
                              updateQty(item.id, Number(e.target.value))
                            }
                            className="w-24 rounded-xl border px-3 py-2"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}