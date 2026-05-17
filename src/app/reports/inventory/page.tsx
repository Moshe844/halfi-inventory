"use client";

import { useEffect, useMemo, useState } from "react";

type InventoryItem = {
  id: string;
  productName: string;
  modelNo?: string;
  sku?: string;
  size?: string;
  quantity?: number;
  pendingQty?: number;
  inStockQty?: number;
  unitCost?: number;
  sellingPrice?: number;
  status?: string;
};

type SalesOrderItem = {
  id: string;
  inventoryId: string;
  productName: string;
  modelNo?: string;
  sku?: string;
  size?: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
};

type SalesOrder = {
  id: string;
  customerName: string;
  date: string;
  status: string;
  items: SalesOrderItem[];
  subtotal: number;
};

type ReceivedRecord = {
  id: string;
  poId: string;
  vendor: string;
  date: string;
  totalQty: number;
  totalCost: number;
  status: string;
};

function money(value: number) {
  return `$${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function getStockQty(item: InventoryItem) {
  return Number(item.quantity ?? item.inStockQty ?? 0);
}

function parseDate(value: string) {
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed;

  const parts = String(value || "").split("/");
  if (parts.length === 3) {
    const [month, day, year] = parts.map(Number);
    return new Date(year, month - 1, day);
  }

  return new Date(0);
}

function readLocalStorage<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

export default function InventoryReportsPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [receivedRecords, setReceivedRecords] = useState<ReceivedRecord[]>([]);

  useEffect(() => {
    loadData();
    window.addEventListener("pageshow", loadData);
    return () => window.removeEventListener("pageshow", loadData);
  }, []);

  function loadData() {
    setInventory(readLocalStorage<InventoryItem[]>("halfi_items", []));
    setSalesOrders(readLocalStorage<SalesOrder[]>("halfi_sales_orders", []));
    setReceivedRecords(readLocalStorage<ReceivedRecord[]>("halfi_receive_inventory", []));
  }

  const totalUnits = inventory.reduce((sum, item) => sum + getStockQty(item), 0);

  const inventoryValue = inventory.reduce(
    (sum, item) => sum + getStockQty(item) * Number(item.unitCost || 0),
    0
  );

  const retailValue = inventory.reduce(
    (sum, item) => sum + getStockQty(item) * Number(item.sellingPrice || item.unitCost || 0),
    0
  );

  const potentialProfit = retailValue - inventoryValue;

  const lowStockItems = inventory.filter((item) => {
    const qty = getStockQty(item);
    return qty > 0 && qty <= 5;
  });

  const outOfStockItems = inventory.filter((item) => getStockQty(item) <= 0);

  const soldItems = salesOrders
    .filter((order) => order.status !== "Cancelled")
    .flatMap((order) =>
      (order.items || []).map((item) => ({
        ...item,
        orderId: order.id,
        orderDate: order.date,
        customerName: order.customerName,
      }))
    );

  const totalSoldQty = soldItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  const soldByProduct = useMemo(() => {
    const map = new Map<
      string,
      {
        productName: string;
        modelNo: string;
        sku: string;
        size: string;
        qtySold: number;
        sales: number;
        cost: number;
        profit: number;
      }
    >();

    soldItems.forEach((item) => {
      const key = `${item.productName}|${item.modelNo || ""}|${item.sku || ""}|${item.size || ""}`;
      const current =
        map.get(key) ||
        {
          productName: item.productName,
          modelNo: item.modelNo || "-",
          sku: item.sku || "-",
          size: item.size || "-",
          qtySold: 0,
          sales: 0,
          cost: 0,
          profit: 0,
        };

      const qty = Number(item.quantity || 0);
      const sales = qty * Number(item.unitPrice || 0);
      const cost = qty * Number(item.unitCost || 0);

      current.qtySold += qty;
      current.sales += sales;
      current.cost += cost;
      current.profit += sales - cost;

      map.set(key, current);
    });

    return [...map.values()].sort((a, b) => b.qtySold - a.qtySold);
  }, [soldItems]);

  const topSellingProduct = soldByProduct[0];

  const currentInventoryRows = [...inventory].sort((a, b) => getStockQty(b) - getStockQty(a));
  const receivedRows = [...receivedRecords].sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime());

  return (
    <main className="min-h-screen bg-zinc-100 p-6 print:bg-white">
      <style>{`@media print { .no-print { display: none !important; } body { background: white !important; } }`}</style>

      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-3xl bg-black p-8 text-white print:rounded-none">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-zinc-400">Halfi Inventory System</p>
          <h1 className="mt-2 text-4xl font-black tracking-widest text-amber-300">INVENTORY REPORTS</h1>
          <p className="mt-2 text-zinc-300">Stock value, low stock, out of stock, product movement, and product profit.</p>
        </div>

        <div className="no-print mb-6 flex flex-wrap gap-3">
          <button type="button" onClick={() => window.print()} className="rounded-xl bg-black px-5 py-3 font-bold text-amber-300">Print Report</button>
          <button type="button" onClick={loadData} className="rounded-xl bg-zinc-200 px-5 py-3 font-bold">Refresh</button>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Units In Stock" value={String(totalUnits)} />
          <StatCard label="Inventory Cost Value" value={money(inventoryValue)} />
          <StatCard label="Potential Retail Value" value={money(retailValue)} />
          <StatCard label="Potential Profit" value={money(potentialProfit)} color={potentialProfit >= 0 ? "text-emerald-700" : "text-red-700"} />
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Low Stock Items" value={String(lowStockItems.length)} color="text-amber-700" />
          <StatCard label="Out of Stock Items" value={String(outOfStockItems.length)} color="text-red-700" />
          <StatCard label="Qty Sold" value={String(totalSoldQty)} />
          <StatCard label="Best Seller" value={topSellingProduct ? topSellingProduct.productName : "-"} />
        </div>

        <div className="mb-6 grid gap-6 xl:grid-cols-2">
          <AlertList title="Low Stock Alerts" items={lowStockItems} empty="No low stock items." color="text-amber-700" />
          <AlertList title="Out of Stock" items={outOfStockItems} empty="No out of stock items." color="text-red-700" />
        </div>

        <TableCard title="Current Inventory">
          {currentInventoryRows.length === 0 ? (
            <p className="text-zinc-500">No inventory yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className="bg-zinc-100 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="p-4">Product</th><th className="p-4">Model</th><th className="p-4">SKU</th><th className="p-4">Size</th><th className="p-4">Stock</th><th className="p-4">Unit Cost</th><th className="p-4">Selling Price</th><th className="p-4">Cost Value</th><th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {currentInventoryRows.map((item) => {
                    const stock = getStockQty(item);
                    const costValue = stock * Number(item.unitCost || 0);
                    return (
                      <tr key={item.id} className="border-t">
                        <td className="p-4 font-bold">{item.productName}</td>
                        <td className="p-4">{item.modelNo || "-"}</td>
                        <td className="p-4">{item.sku || "-"}</td>
                        <td className="p-4">{item.size || "-"}</td>
                        <td className="p-4 font-black">{stock}</td>
                        <td className="p-4">{money(Number(item.unitCost || 0))}</td>
                        <td className="p-4">{money(Number(item.sellingPrice || item.unitCost || 0))}</td>
                        <td className="p-4 font-bold">{money(costValue)}</td>
                        <td className="p-4">{item.status || "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TableCard>

        <TableCard title="Product Sales / Profit">
          {soldByProduct.length === 0 ? (
            <p className="text-zinc-500">No sold products yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className="bg-zinc-100 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="p-4">Product</th><th className="p-4">Model</th><th className="p-4">SKU</th><th className="p-4">Size</th><th className="p-4">Qty Sold</th><th className="p-4">Sales</th><th className="p-4">Cost</th><th className="p-4">Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {soldByProduct.map((item) => (
                    <tr key={`${item.productName}-${item.modelNo}-${item.sku}-${item.size}`} className="border-t">
                      <td className="p-4 font-bold">{item.productName}</td>
                      <td className="p-4">{item.modelNo}</td>
                      <td className="p-4">{item.sku}</td>
                      <td className="p-4">{item.size}</td>
                      <td className="p-4 font-black">{item.qtySold}</td>
                      <td className="p-4">{money(item.sales)}</td>
                      <td className="p-4">{money(item.cost)}</td>
                      <td className={`p-4 font-black ${item.profit >= 0 ? "text-emerald-700" : "text-red-700"}`}>{money(item.profit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TableCard>

        <TableCard title="Inventory Received History">
          {receivedRows.length === 0 ? (
            <p className="text-zinc-500">No received records yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-zinc-100 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="p-4">Received ID</th><th className="p-4">Date</th><th className="p-4">PO</th><th className="p-4">Vendor</th><th className="p-4">Qty</th><th className="p-4">Cost</th><th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {receivedRows.map((row) => (
                    <tr key={row.id} className="border-t">
                      <td className="p-4 font-bold">{row.id}</td>
                      <td className="p-4">{row.date}</td>
                      <td className="p-4">{row.poId}</td>
                      <td className="p-4">{row.vendor}</td>
                      <td className="p-4 font-black">{row.totalQty}</td>
                      <td className="p-4">{money(row.totalCost)}</td>
                      <td className="p-4">{row.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TableCard>
      </div>
    </main>
  );
}

function AlertList({ title, items, empty, color }: { title: string; items: InventoryItem[]; empty: string; color: string }) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-2xl font-black">{title}</h2>
      {items.length === 0 ? <p className="text-zinc-500">{empty}</p> : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-2xl border p-4">
              <div>
                <p className="font-black">{item.productName}</p>
                <p className="text-sm text-zinc-500">Model: {item.modelNo || "-"} · SKU: {item.sku || "-"} · Size: {item.size || "-"}</p>
              </div>
              <p className={`text-2xl font-black ${color}`}>{getStockQty(item)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color = "text-black" }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className={`mt-2 text-3xl font-black ${color}`}>{value}</p>
    </div>
  );
}

function TableCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-2xl font-black">{title}</h2>
      {children}
    </div>
  );
}
