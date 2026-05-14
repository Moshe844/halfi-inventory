"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type POItem = {
  id: string;
  productName: string;
  modelNo: string;
  sku?: string;
  size: string;
  quantity: number;
  unitCost: number;
};

type ExtraCosts = {
  shippingFee: number;
  insuranceFee: number;
  bankFee: number;
  otherFee: number;
  discount: number;
};

type PaymentMethod = "Bank Transfer" | "Credit Card" | "Cash" | "Other";

type BillStatus = "Open" | "Partially Paid" | "Paid";

type Bill = {
  id: string;
  poId: string;
  vendor: string;
  date: string;
  status: BillStatus;
  amountPaid: number;
  extraCosts?: ExtraCosts;
  items: POItem[];
};

const defaultExtraCosts: ExtraCosts = {
  shippingFee: 0,
  insuranceFee: 0,
  bankFee: 0,
  otherFee: 0,
  discount: 0,
};

function getItemSubtotal(items: POItem[]) {
  return items.reduce(
    (sum, item) =>
      sum + Number(item.quantity || 0) * Number(item.unitCost || 0),
    0
  );
}

function getExtraCosts(bill: { extraCosts?: ExtraCosts }) {
  return bill.extraCosts || defaultExtraCosts;
}

function getGrandTotal(bill: { items: POItem[]; extraCosts?: ExtraCosts }) {
  const subtotal = getItemSubtotal(bill.items);
  const costs = getExtraCosts(bill);

  return (
    subtotal +
    Number(costs.shippingFee || 0) +
    Number(costs.insuranceFee || 0) +
    Number(costs.bankFee || 0) +
    Number(costs.otherFee || 0) -
    Number(costs.discount || 0)
  );
}

function formatMoney(value: number) {
  return `$${Number(value || 0).toLocaleString()}`;
}

function escapeHtml(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default function BillsPage() {
  const router = useRouter();

  const [bills, setBills] = useState<Bill[]>([]);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("Bank Transfer");
  const [paymentNote, setPaymentNote] = useState("");

  useEffect(() => {
    function loadBills() {
      const savedBills = localStorage.getItem("halfi_bills");
      const parsedBills = savedBills ? JSON.parse(savedBills) : [];

      setBills(parsedBills);

      const pendingPO = localStorage.getItem("halfi_pending_bill_po");
      const openBillId = localStorage.getItem("halfi_open_bill_id");

      if (pendingPO) {
        const po = JSON.parse(pendingPO);

        const alreadyExists = parsedBills.some(
          (bill: Bill) => bill.poId === po.id
        );

        if (!alreadyExists) {
          const newBill: Bill = {
            id: `BILL-${Date.now()}`,
            poId: po.id,
            vendor: po.vendor,
            date: new Date().toLocaleDateString(),
            status: "Open",
            amountPaid: Number(po.amountPaid || 0),
            extraCosts: po.extraCosts || defaultExtraCosts,
            items: po.items,
          };

          const updatedBills = [newBill, ...parsedBills];

          setBills(updatedBills);
          localStorage.setItem("halfi_bills", JSON.stringify(updatedBills));
          updatePO(po.id, "Issued", Number(po.amountPaid || 0), []);

          setSelectedBill(newBill);
        }

        localStorage.removeItem("halfi_pending_bill_po");
      } else if (openBillId) {
        const foundBill = parsedBills.find(
          (bill: Bill) => bill.id === openBillId
        );

        if (foundBill) {
          setSelectedBill(foundBill);
        }

        localStorage.removeItem("halfi_open_bill_id");
      }
    }

    loadBills();
    window.addEventListener("pageshow", loadBills);

    return () => {
      window.removeEventListener("pageshow", loadBills);
    };
  }, []);

  function saveBills(updated: Bill[]) {
    setBills(updated);
    localStorage.setItem("halfi_bills", JSON.stringify(updated));
  }

  function updatePO(
    poId: string,
    status: string,
    amountPaid: number,
    newPayments: any[]
  ) {
    const savedPOs = localStorage.getItem("halfi_purchase_orders");
    const pos = savedPOs ? JSON.parse(savedPOs) : [];

    const updatedPOs = pos.map((po: any) =>
      po.id === poId
        ? {
            ...po,
            status,
            amountPaid,
            payments: [...(po.payments || []), ...newPayments],
          }
        : po
    );

    localStorage.setItem("halfi_purchase_orders", JSON.stringify(updatedPOs));
  }

  function openPurchaseOrder(poId: string) {
    localStorage.setItem("halfi_open_po_id", poId);
    router.push("/purchase-orders");
  }

  function savePayment() {
    if (!selectedBill) return;

    const amount = Number(paymentAmount || 0);

    if (amount <= 0) {
      alert("Enter a valid payment amount.");
      return;
    }

    const total = getGrandTotal(selectedBill);
    const newPaid = Number(selectedBill.amountPaid || 0) + amount;
    const amountOwed = Math.max(total - newPaid, 0);
    const newStatus: BillStatus = newPaid >= total ? "Paid" : "Partially Paid";

    const payment = {
      id: `PAY-${Date.now()}`,
      billId: selectedBill.id,
      poId: selectedBill.poId,
      vendor: selectedBill.vendor,
      date: new Date().toLocaleDateString(),
      amount,
      amountOwed,
      method: paymentMethod,
      note: paymentNote,
      status: newStatus,
    };

    const savedPayments = localStorage.getItem("halfi_payments_made");
    const payments = savedPayments ? JSON.parse(savedPayments) : [];

    localStorage.setItem(
      "halfi_payments_made",
      JSON.stringify([payment, ...payments])
    );

    const updatedBills = bills.map((bill) =>
      bill.id === selectedBill.id
        ? {
            ...bill,
            amountPaid: newPaid,
            status: newStatus,
          }
        : bill
    );

    saveBills(updatedBills);

    updatePO(selectedBill.poId, newStatus, newPaid, [
      {
        id: payment.id,
        date: payment.date,
        amount: payment.amount,
        method: payment.method,
        note: payment.note || `Bill ${selectedBill.id}`,
      },
    ]);

    setPaymentAmount("");
    setPaymentMethod("Bank Transfer");
    setPaymentNote("");
    setSelectedBill(null);

    alert("Payment saved.");
  }


  function printBillDocument(bill: Bill) {
    const savedVendors = localStorage.getItem("halfi_vendors");
    const vendors = savedVendors ? JSON.parse(savedVendors) : [];
    const vendor = vendors.find((v: any) => v.name === bill.vendor);
    const costs = getExtraCosts(bill);
    const subtotal = getItemSubtotal(bill.items);
    const total = getGrandTotal(bill);
    const balance = total - Number(bill.amountPaid || 0);

    const itemRows = bill.items
      .map(
        (item) => `
          <tr>
            <td><b>${escapeHtml(item.productName)}</b></td>
            <td>${escapeHtml(item.modelNo || "")}</td>
            <td>${escapeHtml(item.sku || "-")}</td>
            <td>${escapeHtml(item.size || "")}</td>
            <td class="right">${Number(item.quantity || 0)}</td>
            <td class="right">${formatMoney(Number(item.unitCost || 0))}</td>
            <td class="right"><b>${formatMoney(
              Number(item.quantity || 0) * Number(item.unitCost || 0)
            )}</b></td>
          </tr>
        `
      )
      .join("");

    const html = `
      <html>
        <head>
          <title>${escapeHtml(bill.id)}</title>
          <style>
            @page {
              size: letter;
              margin: 0.45in;
            }

            * {
              box-sizing: border-box;
            }

            html,
            body {
              margin: 0;
              padding: 0;
              background: #e5e7eb;
              color: #111;
              font-family: Arial, sans-serif;
            }

            .toolbar {
              position: sticky;
              top: 0;
              z-index: 10;
              display: flex;
              justify-content: center;
              gap: 10px;
              padding: 14px;
              background: #e5e7eb;
              border-bottom: 1px solid #d4d4d8;
            }

            .btn {
              border: 0;
              border-radius: 12px;
              padding: 11px 18px;
              font-weight: 800;
              cursor: pointer;
            }

            .btn-primary {
              background: #111;
              color: #facc15;
            }

            .btn-secondary {
              background: white;
              color: #111;
            }

            .sheet {
              width: 8in;
              min-height: 10.2in;
              margin: 22px auto;
              padding: 0.42in;
              background: white;
              box-shadow: 0 18px 45px rgba(0, 0, 0, 0.22);
            }

            .header {
              display: flex;
              justify-content: space-between;
              gap: 24px;
              border-bottom: 4px solid #111;
              padding-bottom: 18px;
              margin-bottom: 22px;
            }

            .eyebrow {
              font-size: 10px;
              font-weight: 900;
              letter-spacing: 3px;
              color: #666;
              text-transform: uppercase;
            }

            h1 {
              font-size: 34px;
              line-height: 1;
              margin: 7px 0;
            }

            h2 {
              margin: 0 0 10px;
              font-size: 18px;
            }

            h3 {
              margin: 22px 0 10px;
              font-size: 18px;
            }

            .status {
              background: #111;
              color: white;
              border-radius: 16px;
              padding: 14px 18px;
              text-align: right;
              min-width: 145px;
              height: fit-content;
            }

            .status strong {
              display: block;
              color: #facc15;
              font-size: 22px;
              margin-top: 4px;
            }

            .grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 14px;
              margin-bottom: 22px;
            }

            .box {
              background: #f4f4f5;
              border-radius: 16px;
              padding: 16px;
              min-height: 115px;
            }

            .small {
              font-size: 12px;
              color: #444;
              line-height: 1.55;
            }

            .summary {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 9px;
              margin: 14px 0 22px;
            }

            .card {
              border: 1px solid #ddd;
              border-radius: 12px;
              padding: 10px;
              min-height: 58px;
            }

            .card .label {
              color: #666;
              font-size: 9px;
              text-transform: uppercase;
              font-weight: 800;
            }

            .card .value {
              font-weight: 900;
              font-size: 15px;
              margin-top: 5px;
            }

            .total-card {
              background: #111;
              color: white;
              grid-column: span 2;
            }

            .total-card .value {
              color: #facc15;
              font-size: 21px;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 10.5px;
            }

            th {
              background: #111;
              color: white;
              text-align: left;
              padding: 7px;
              font-size: 9px;
              text-transform: uppercase;
            }

            td {
              border-bottom: 1px solid #ddd;
              padding: 7px;
            }

            .right {
              text-align: right;
            }

            .footer {
              margin-top: 24px;
              border-top: 1px solid #ddd;
              padding-top: 10px;
              color: #666;
              font-size: 10px;
            }

            @media print {
              html,
              body {
                background: white;
              }

              .toolbar {
                display: none;
              }

              .sheet {
                width: auto;
                min-height: auto;
                margin: 0;
                padding: 0;
                box-shadow: none;
              }

              .box,
              .card,
              tr {
                break-inside: avoid;
              }
            }
          </style>
        </head>

        <body>
          <div class="toolbar">
            <button class="btn btn-primary" onclick="window.print()">Print / Save PDF</button>
            <button class="btn btn-secondary" onclick="window.close()">Close</button>
          </div>

          <div class="sheet">
            <div class="header">
              <div>
                <div class="eyebrow">Vendor Bill</div>
                <h1>${escapeHtml(bill.id)}</h1>
                <div class="small">PO: ${escapeHtml(bill.poId)} · Date: ${escapeHtml(bill.date)}</div>
              </div>

              <div class="status">
                <div class="eyebrow">Status</div>
                <strong>${escapeHtml(bill.status)}</strong>
              </div>
            </div>

            <div class="grid">
              <div class="box">
                <div class="eyebrow">Vendor</div>
                <h2>${escapeHtml(bill.vendor)}</h2>
                <div class="small">
                  ${vendor?.contactName ? `<div><b>Contact:</b> ${escapeHtml(vendor.contactName)}</div>` : ""}
                  ${vendor?.email ? `<div><b>Email:</b> ${escapeHtml(vendor.email)}</div>` : ""}
                  ${vendor?.whatsapp ? `<div><b>WhatsApp:</b> ${escapeHtml(vendor.whatsapp)}</div>` : ""}
                  ${vendor?.address ? `<div><b>Address:</b> ${escapeHtml(vendor.address)}</div>` : ""}
                </div>
              </div>

              <div class="box">
                <div class="eyebrow">Payment Summary</div>
                <div class="summary" style="grid-template-columns: 1fr 1fr; margin-bottom: 0;">
                  <div>
                    <div class="small">Grand Total</div>
                    <h2>${formatMoney(total)}</h2>
                  </div>
                  <div>
                    <div class="small">Still Owe</div>
                    <h2>${formatMoney(balance)}</h2>
                  </div>
                  <div>
                    <div class="small">Amount Paid</div>
                    <h2>${formatMoney(Number(bill.amountPaid || 0))}</h2>
                  </div>
                  <div>
                    <div class="small">Items Subtotal</div>
                    <h2>${formatMoney(subtotal)}</h2>
                  </div>
                </div>
              </div>
            </div>

            <h3>Cost Summary</h3>
            <div class="summary">
              <div class="card">
                <div class="label">Items Subtotal</div>
                <div class="value">${formatMoney(subtotal)}</div>
              </div>
              <div class="card">
                <div class="label">Shipping</div>
                <div class="value">${formatMoney(Number(costs.shippingFee || 0))}</div>
              </div>
              <div class="card">
                <div class="label">Insurance</div>
                <div class="value">${formatMoney(Number(costs.insuranceFee || 0))}</div>
              </div>
              <div class="card">
                <div class="label">Discount</div>
                <div class="value">${formatMoney(Number(costs.discount || 0))}</div>
              </div>
              <div class="card">
                <div class="label">Bank Fee</div>
                <div class="value">${formatMoney(Number(costs.bankFee || 0))}</div>
              </div>
              <div class="card">
                <div class="label">Other Fee</div>
                <div class="value">${formatMoney(Number(costs.otherFee || 0))}</div>
              </div>
              <div class="card total-card">
                <div class="label">Grand Total</div>
                <div class="value">${formatMoney(total)}</div>
              </div>
            </div>

            <h3>Items</h3>
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Model</th>
                  <th>SKU</th>
                  <th>Size</th>
                  <th class="right">Qty</th>
                  <th class="right">Unit Cost</th>
                  <th class="right">Total</th>
                </tr>
              </thead>
              <tbody>${itemRows}</tbody>
            </table>

            <div class="footer">
              Generated by Halfi Inventory System · ${new Date().toLocaleString()}
            </div>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      alert("Popup blocked. Please allow popups to print.");
      return;
    }

    printWindow.document.write(html);
    printWindow.document.close();
  }


 function deleteBill(bill: Bill) {
  const savedPayments = localStorage.getItem("halfi_payments_made");
  const payments = savedPayments ? JSON.parse(savedPayments) : [];

  const relatedPayments = payments.filter(
    (payment: any) => payment.billId === bill.id
  );

  // BLOCK DELETE IF PAYMENTS EXIST
  if (relatedPayments.length > 0) {
    alert(
      "Cannot delete this bill until all related payments are deleted first."
    );
    return;
  }

  const confirmDelete = window.confirm(
    "Delete this bill? The related purchase order will be reset back to Issued."
  );

  if (!confirmDelete) return;

  const updatedBills = bills.filter((b) => b.id !== bill.id);

  saveBills(updatedBills);

  const savedPOs = localStorage.getItem("halfi_purchase_orders");
  const pos = savedPOs ? JSON.parse(savedPOs) : [];

  const updatedPOs = pos.map((po: any) =>
    po.id === bill.poId
      ? {
          ...po,
          status: "Issued",
          amountPaid: 0,
          payments: [],
        }
      : po
  );

  localStorage.setItem(
    "halfi_purchase_orders",
    JSON.stringify(updatedPOs)
  );

  setSelectedBill(null);

  alert("Bill deleted.");
}

  const totalBills = bills.length;
  const totalBillValue = bills.reduce(
    (sum, bill) => sum + getGrandTotal(bill),
    0
  );
  const totalPaid = bills.reduce(
    (sum, bill) => sum + Number(bill.amountPaid || 0),
    0
  );
  const totalOwed = totalBillValue - totalPaid;

  return (
    <main className="min-h-screen bg-zinc-100 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-3xl bg-black p-8 text-white">
          <h1 className="text-4xl font-black tracking-widest text-amber-300">
            BILLS
          </h1>
          <p className="mt-2 text-zinc-300">
            Convert purchase orders into bills and track balances.
          </p>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm text-zinc-500">Total Bills</p>
            <p className="mt-2 text-3xl font-black">{totalBills}</p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm text-zinc-500">Bill Total</p>
            <p className="mt-2 text-3xl font-black">
              ${totalBillValue.toLocaleString()}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm text-zinc-500">Paid</p>
            <p className="mt-2 text-3xl font-black">
              ${totalPaid.toLocaleString()}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm text-zinc-500">Still Owe</p>
            <p className="mt-2 text-3xl font-black">
              ${totalOwed.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-2xl font-bold">Saved Bills</h2>

          {bills.length === 0 ? (
            <p className="text-zinc-500">
              No bills yet. Convert a PO to bill first.
            </p>
          ) : (
            <div className="space-y-4">
              {bills.map((bill) => {
                const total = getGrandTotal(bill);
                const balance = total - Number(bill.amountPaid || 0);

                return (
                  <button
                    type="button"
                    key={bill.id}
                    onClick={() => setSelectedBill(bill)}
                    className="w-full rounded-2xl border p-5 text-left transition hover:bg-zinc-50"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-black">{bill.id}</h3>
                        <p className="text-sm text-zinc-500">
                          PO: {bill.poId} · {bill.vendor}
                        </p>
                        <p className="mt-1 font-bold">
                          Total: ${total.toLocaleString()} · Paid: $
                          {Number(bill.amountPaid || 0).toLocaleString()} · Owed:
                          ${balance.toLocaleString()}
                        </p>
                      </div>

                      <span className="rounded-full bg-zinc-100 px-4 py-2 text-sm font-bold">
                        {bill.status}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {selectedBill && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
            <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <h2 className="text-3xl font-black">{selectedBill.id}</h2>

                  <button
                    type="button"
                    onClick={() => openPurchaseOrder(selectedBill.poId)}
                    className="text-zinc-500 underline hover:text-black"
                  >
                    PO: {selectedBill.poId}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedBill(null)}
                  className="rounded-xl bg-zinc-100 px-4 py-2 font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="mb-6 grid gap-4 md:grid-cols-4">
                <div className="rounded-2xl bg-zinc-100 p-4">
                  <p className="text-xs uppercase text-zinc-500">Status</p>
                  <p className="mt-1 text-lg font-black">
                    {selectedBill.status}
                  </p>
                </div>

                <div className="rounded-2xl bg-zinc-100 p-4">
                  <p className="text-xs uppercase text-zinc-500">
                    Items Subtotal
                  </p>
                  <p className="mt-1 text-lg font-black">
                    ${getItemSubtotal(selectedBill.items).toLocaleString()}
                  </p>
                </div>

                <div className="rounded-2xl bg-zinc-100 p-4">
                  <p className="text-xs uppercase text-zinc-500">Shipping</p>
                  <p className="mt-1 text-lg font-black">
                    $
                    {Number(
                      getExtraCosts(selectedBill).shippingFee || 0
                    ).toLocaleString()}
                  </p>
                </div>

                <div className="rounded-2xl bg-zinc-100 p-4">
                  <p className="text-xs uppercase text-zinc-500">Grand Total</p>
                  <p className="mt-1 text-lg font-black">
                    ${getGrandTotal(selectedBill).toLocaleString()}
                  </p>
                </div>

                <div className="rounded-2xl bg-zinc-100 p-4">
                  <p className="text-xs uppercase text-zinc-500">Paid</p>
                  <p className="mt-1 text-lg font-black">
                    ${Number(selectedBill.amountPaid || 0).toLocaleString()}
                  </p>
                </div>

                <div className="rounded-2xl bg-zinc-100 p-4">
                  <p className="text-xs uppercase text-zinc-500">Still Owe</p>
                  <p className="mt-1 text-lg font-black">
                    $
                    {(
                      getGrandTotal(selectedBill) -
                      Number(selectedBill.amountPaid || 0)
                    ).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="mb-6 rounded-2xl bg-zinc-100 p-5">
                <h3 className="mb-3 text-xl font-bold">Make Payment</h3>

                <div className="grid gap-3 md:grid-cols-4">
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="Payment amount"
                    className="rounded-xl border px-4 py-3 md:col-span-1"
                  />

                  <select
                    value={paymentMethod}
                    onChange={(e) =>
                      setPaymentMethod(e.target.value as PaymentMethod)
                    }
                    className="rounded-xl border px-4 py-3 font-bold"
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Cash">Cash</option>
                    <option value="Other">Other</option>
                  </select>

                  <input
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    placeholder="Note"
                    className="rounded-xl border px-4 py-3"
                  />

                  <button
                    type="button"
                    onClick={savePayment}
                    className="rounded-xl bg-black px-5 py-3 font-bold text-amber-300"
                  >
                    Save Payment
                  </button>
                </div>
              </div>

              <div className="mb-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => openPurchaseOrder(selectedBill.poId)}
                  className="rounded-xl bg-amber-400 px-5 py-3 font-bold text-black"
                >
                  Open Purchase Order
                </button>

                <button
                  type="button"
                  onClick={() => printBillDocument(selectedBill)}
                  className="rounded-xl bg-black px-5 py-3 font-bold text-amber-300"
                >
                  Print Bill
                </button>

                <button
                  type="button"
                  onClick={() => deleteBill(selectedBill)}
                  className="rounded-xl bg-red-600 px-5 py-3 font-bold text-white"
                >
                  Delete Bill
                </button>
              </div>

              <div className="overflow-x-auto rounded-2xl border">
                <table className="w-full min-w-[800px] text-left text-sm">
                  <thead className="bg-zinc-100 text-xs uppercase text-zinc-500">
                    <tr>
                      <th className="p-4">Product</th>
                      <th className="p-4">Model</th>
                      <th className="p-4">SKU</th>
                      <th className="p-4">Size</th>
                      <th className="p-4">Qty</th>
                      <th className="p-4">Unit Cost</th>
                      <th className="p-4">Total</th>
                    </tr>
                  </thead>

                  <tbody>
                    {selectedBill.items.map((item) => (
                      <tr key={item.id} className="border-t">
                        <td className="p-4 font-bold">{item.productName}</td>
                        <td className="p-4">{item.modelNo}</td>
                        <td className="p-4">{item.sku || "-"}</td>
                        <td className="p-4">{item.size}</td>
                        <td className="p-4">{item.quantity}</td>
                        <td className="p-4">${item.unitCost}</td>
                        <td className="p-4 font-bold">
                          ${(item.quantity * item.unitCost).toLocaleString()}
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