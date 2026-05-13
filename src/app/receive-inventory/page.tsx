"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type ReceivedItem = {
  id: string;
  productName: string;
  modelNo: string;
  size: string;
  quantity: number;
  unitCost: number;
};

type ReceiveRecord = {
  id: string;
  poId: string;
  vendor: string;
  date: string;
  totalQty: number;
  totalCost: number;
  status: "Received";
  items: ReceivedItem[];
};

export default function ReceiveInventoryPage() {
  const router = useRouter();
  const [records, setRecords] = useState<ReceiveRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<ReceiveRecord | null>(null);

  useEffect(() => {
    function loadRecords() {
      const saved = localStorage.getItem("halfi_receive_inventory");
      try {
        setRecords(saved ? JSON.parse(saved) : []);
      } catch {
        setRecords([]);
      }
    }

    loadRecords();
    window.addEventListener("pageshow", loadRecords);
    return () => window.removeEventListener("pageshow", loadRecords);
  }, []);

  function openPurchaseOrder(poId: string) {
    localStorage.setItem("halfi_open_po_id", poId);
    router.push("/purchase-orders");
  }

  const totalReceived = records.length;
  const totalQty = records.reduce((sum, record) => sum + Number(record.totalQty || 0), 0);
  const totalCost = records.reduce((sum, record) => sum + Number(record.totalCost || 0), 0);

  return (
    <main className="min-h-screen bg-zinc-100 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-3xl bg-black p-8 text-white">
          <h1 className="text-4xl font-black tracking-widest text-amber-300">
            RECEIVE INVENTORY
          </h1>
          <p className="mt-2 text-zinc-300">
            History of purchase orders received into inventory.
          </p>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm text-zinc-500">Received Shipments</p>
            <p className="mt-2 text-3xl font-black">{totalReceived}</p>
          </div>
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm text-zinc-500">Total Qty Received</p>
            <p className="mt-2 text-3xl font-black">{totalQty}</p>
          </div>
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm text-zinc-500">Total Cost Received</p>
            <p className="mt-2 text-3xl font-black">${totalCost.toLocaleString()}</p>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-2xl font-bold">Received Inventory</h2>
          {records.length === 0 ? (
            <p className="text-zinc-500">No inventory received yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className="bg-zinc-100 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="p-4">Received ID</th>
                    <th className="p-4">Date Received</th>
                    <th className="p-4">PO Number</th>
                    <th className="p-4">Vendor</th>
                    <th className="p-4">Total Qty</th>
                    <th className="p-4">Total Cost</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">View Details</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id} className="border-t">
                      <td className="p-4 font-black">{record.id}</td>
                      <td className="p-4">{record.date}</td>
                      <td className="p-4 font-bold">{record.poId}</td>
                      <td className="p-4">{record.vendor}</td>
                      <td className="p-4 font-black">{record.totalQty}</td>
                      <td className="p-4 font-black">${Number(record.totalCost || 0).toLocaleString()}</td>
                      <td className="p-4">
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                          {record.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <button
                          type="button"
                          onClick={() => setSelectedRecord(record)}
                          className="rounded-xl bg-black px-4 py-2 font-bold text-amber-300"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selectedRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
            <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <h2 className="text-3xl font-black">{selectedRecord.id}</h2>
                  <p className="mt-1 text-zinc-500">
                    {selectedRecord.vendor} · {selectedRecord.date}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="rounded-xl bg-zinc-100 px-4 py-2 font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="mb-6 grid gap-4 md:grid-cols-4">
                <div className="rounded-2xl bg-zinc-100 p-4">
                  <p className="text-xs uppercase text-zinc-500">PO Number</p>
                  <p className="mt-1 text-lg font-black">{selectedRecord.poId}</p>
                </div>
                <div className="rounded-2xl bg-zinc-100 p-4">
                  <p className="text-xs uppercase text-zinc-500">Total Qty</p>
                  <p className="mt-1 text-lg font-black">{selectedRecord.totalQty}</p>
                </div>
                <div className="rounded-2xl bg-zinc-100 p-4">
                  <p className="text-xs uppercase text-zinc-500">Total Cost</p>
                  <p className="mt-1 text-lg font-black">${Number(selectedRecord.totalCost || 0).toLocaleString()}</p>
                </div>
                <div className="rounded-2xl bg-zinc-100 p-4">
                  <p className="text-xs uppercase text-zinc-500">Status</p>
                  <p className="mt-1 text-lg font-black">{selectedRecord.status}</p>
                </div>
              </div>

              <div className="mb-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => openPurchaseOrder(selectedRecord.poId)}
                  className="rounded-xl bg-amber-400 px-5 py-3 font-bold text-black"
                >
                  Open Purchase Order
                </button>
              </div>

              <div className="overflow-x-auto rounded-2xl border">
                <table className="w-full min-w-[800px] text-left text-sm">
                  <thead className="bg-zinc-100 text-xs uppercase text-zinc-500">
                    <tr>
                      <th className="p-4">Product</th>
                      <th className="p-4">Model</th>
                      <th className="p-4">Size</th>
                      <th className="p-4">Qty Received</th>
                      <th className="p-4">Unit Cost</th>
                      <th className="p-4">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRecord.items.map((item) => (
                      <tr key={item.id} className="border-t">
                        <td className="p-4 font-bold">{item.productName}</td>
                        <td className="p-4">{item.modelNo}</td>
                        <td className="p-4">{item.size}</td>
                        <td className="p-4 font-black">{item.quantity}</td>
                        <td className="p-4">${Number(item.unitCost || 0)}</td>
                        <td className="p-4 font-bold">
                          ${(Number(item.quantity || 0) * Number(item.unitCost || 0)).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
