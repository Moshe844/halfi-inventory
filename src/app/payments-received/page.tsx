"use client";

import { useEffect, useMemo, useState } from "react";

type PaymentMethod = "Cash" | "Credit Card" | "Bank Transfer" | "Check" | "Other";

type PaymentReceived = {
  id: string;
  salesOrderId: string;
  customerName: string;
  date: string;
  amount: number;
  method: PaymentMethod;
  note?: string;
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
  customerEmail?: string;
  customerPhone?: string;
  customerWhatsApp?: string;
  date: string;
  status: "Completed" | "Cancelled";
  items: SalesOrderItem[];
  subtotal: number;
  amountPaid?: number;
  payments?: PaymentReceived[];
};

function money(value: number) {
  return `$${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function parseDate(value: string) {
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed;

  const parts = value.split("/");
  if (parts.length === 3) {
    const [month, day, year] = parts.map(Number);
    return new Date(year, month - 1, day);
  }

  return new Date(0);
}

function displayDate(value: string) {
  const date = parseDate(value);
  if (date.getTime() === 0) return value || "-";
  return date.toLocaleDateString();
}

function getOrderTotal(order: SalesOrder) {
  return Number(
    order.subtotal ||
      order.items.reduce(
        (sum, item) =>
          sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
        0
      )
  );
}

function getOrderPaid(order: SalesOrder) {
  if (typeof order.amountPaid === "number") return Number(order.amountPaid || 0);

  return (order.payments || []).reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0
  );
}

function getOrderBalance(order: SalesOrder) {
  return Math.max(getOrderTotal(order) - getOrderPaid(order), 0);
}

function getPaymentStatus(order: SalesOrder) {
  const total = getOrderTotal(order);
  const paid = getOrderPaid(order);

  if (paid <= 0) return "Unpaid";
  if (paid >= total) return "Paid";
  return "Partially Paid";
}

export default function PaymentsReceivedPage() {
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [payments, setPayments] = useState<PaymentReceived[]>([]);

  useEffect(() => {
    loadData();
    window.addEventListener("pageshow", loadData);

    return () => {
      window.removeEventListener("pageshow", loadData);
    };
  }, []);

  function loadData() {
    try {
      const savedOrders = localStorage.getItem("halfi_sales_orders");
      setSalesOrders(savedOrders ? JSON.parse(savedOrders) : []);
    } catch {
      setSalesOrders([]);
    }

    try {
      const savedPayments = localStorage.getItem("halfi_payments_received");
      setPayments(savedPayments ? JSON.parse(savedPayments) : []);
    } catch {
      setPayments([]);
    }
  }

  function saveOrders(updated: SalesOrder[]) {
    setSalesOrders(updated);
    localStorage.setItem("halfi_sales_orders", JSON.stringify(updated));
  }

  function savePayments(updated: PaymentReceived[]) {
    setPayments(updated);
    localStorage.setItem("halfi_payments_received", JSON.stringify(updated));
  }

  const totalSales = salesOrders
    .filter((order) => order.status !== "Cancelled")
    .reduce((sum, order) => sum + getOrderTotal(order), 0);

  const totalReceived = payments.reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0
  );

  const totalOutstanding = salesOrders
    .filter((order) => order.status !== "Cancelled")
    .reduce((sum, order) => sum + getOrderBalance(order), 0);

  const paidOrders = salesOrders.filter(
    (order) => order.status !== "Cancelled" && getPaymentStatus(order) === "Paid"
  ).length;

  const sortedPayments = useMemo(() => {
    return [...payments].sort(
      (a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime()
    );
  }, [payments]);

  function deletePayment(payment: PaymentReceived) {
    const confirmDelete = window.confirm(
      "Delete this payment? This will increase the customer balance on the sale."
    );

    if (!confirmDelete) return;

    const updatedPayments = payments.filter((p) => p.id !== payment.id);

    const updatedOrders = salesOrders.map((order) => {
      if (order.id !== payment.salesOrderId) return order;

      return {
        ...order,
        amountPaid: Math.max(getOrderPaid(order) - Number(payment.amount || 0), 0),
        payments: (order.payments || []).filter((p) => p.id !== payment.id),
      };
    });

    savePayments(updatedPayments);
    saveOrders(updatedOrders);

    alert("Payment deleted.");
  }

  function printReceipt(payment: PaymentReceived) {
    const order = salesOrders.find((so) => so.id === payment.salesOrderId);

    const html = `
      <html>
        <head>
          <title>${payment.id}</title>
          <style>
            @page { size: letter; margin: 0.5in; }
            * { box-sizing: border-box; }
            body { margin: 0; background: #e5e7eb; font-family: Arial, sans-serif; color: #111; }
            .toolbar { display: flex; justify-content: center; gap: 10px; padding: 14px; background: #e5e7eb; }
            .btn { border: 0; border-radius: 12px; padding: 11px 18px; font-weight: 800; cursor: pointer; }
            .btn-primary { background: #111; color: #facc15; }
            .btn-secondary { background: white; color: #111; }
            .sheet { width: 7.5in; margin: 22px auto; padding: 0.45in; background: white; box-shadow: 0 18px 45px rgba(0,0,0,.22); }
            .header { display: flex; justify-content: space-between; border-bottom: 4px solid #111; padding-bottom: 18px; margin-bottom: 24px; }
            .eyebrow { font-size: 11px; font-weight: 900; letter-spacing: 3px; color: #666; text-transform: uppercase; }
            h1 { font-size: 38px; margin: 7px 0; }
            .amount { background: #111; color: white; border-radius: 16px; padding: 16px 20px; text-align: right; }
            .amount strong { display: block; color: #facc15; font-size: 28px; margin-top: 4px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
            .box { background: #f4f4f5; border-radius: 16px; padding: 16px; }
            .label { color: #666; font-size: 12px; }
            .value { font-size: 20px; font-weight: 900; margin-top: 4px; }
            .footer { margin-top: 28px; border-top: 1px solid #ddd; padding-top: 12px; color: #666; font-size: 11px; }
            @media print { body { background: white; } .toolbar { display:none; } .sheet { width:auto; margin:0; padding:0; box-shadow:none; } }
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
                <div class="eyebrow">Payment Receipt</div>
                <h1>${payment.id}</h1>
                <div class="label">Date: ${payment.date}</div>
              </div>

              <div class="amount">
                <div class="eyebrow">Amount Received</div>
                <strong>${money(payment.amount)}</strong>
              </div>
            </div>

            <div class="grid">
              <div class="box">
                <div class="label">Customer</div>
                <div class="value">${payment.customerName}</div>
              </div>

              <div class="box">
                <div class="label">Sales / Invoice</div>
                <div class="value">${payment.salesOrderId}</div>
              </div>

              <div class="box">
                <div class="label">Payment Method</div>
                <div class="value">${payment.method}</div>
              </div>

              <div class="box">
                <div class="label">Balance After Payment</div>
                <div class="value">${order ? money(getOrderBalance(order)) : "-"}</div>
              </div>
            </div>

            ${
              payment.note
                ? `<div class="box" style="margin-top:14px;"><div class="label">Note</div><div class="value">${payment.note}</div></div>`
                : ""
            }

            <div class="footer">Generated by Halfi Inventory System · ${new Date().toLocaleString()}</div>
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

  return (
    <main className="min-h-screen bg-zinc-100 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-3xl bg-black p-8 text-white">
          <h1 className="text-4xl font-black tracking-widest text-amber-300">
            PAYMENTS RECEIVED
          </h1>
          <p className="mt-2 text-zinc-300">
            Ledger of all customer payments collected from sales/invoices.
          </p>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <StatCard label="Total Sales" value={money(totalSales)} />
          <StatCard label="Payments Received" value={money(totalReceived)} color="text-emerald-700" />
          <StatCard label="Still Owed by Customers" value={money(totalOutstanding)} color="text-amber-700" />
          <StatCard label="Paid Sales / Invoices" value={String(paidOrders)} />
        </div>

        <div className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-2xl font-bold">Customer Balances</h2>

          {salesOrders.length === 0 ? (
            <p className="text-zinc-500">No sales yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-zinc-100 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="p-4">Sales / Invoice</th>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Total</th>
                    <th className="p-4">Paid</th>
                    <th className="p-4">Balance</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {salesOrders
                    .filter((order) => order.status !== "Cancelled")
                    .map((order) => (
                      <tr key={order.id} className="border-t">
                        <td className="p-4 font-bold">{order.id}</td>
                        <td className="p-4">{order.customerName}</td>
                        <td className="p-4">{displayDate(order.date)}</td>
                        <td className="p-4">{money(getOrderTotal(order))}</td>
                        <td className="p-4 font-bold text-emerald-700">
                          {money(getOrderPaid(order))}
                        </td>
                        <td className="p-4 font-bold text-amber-700">
                          {money(getOrderBalance(order))}
                        </td>
                        <td className="p-4">
                          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold">
                            {getPaymentStatus(order)}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-2xl font-bold">Payment History</h2>

          {sortedPayments.length === 0 ? (
            <p className="text-zinc-500">No received payments yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className="bg-zinc-100 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="p-4">Date</th>
                    <th className="p-4">Payment ID</th>
                    <th className="p-4">Sales / Invoice</th>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Method</th>
                    <th className="p-4">Note</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {sortedPayments.map((payment) => (
                    <tr key={payment.id} className="border-t">
                      <td className="p-4">{displayDate(payment.date)}</td>
                      <td className="p-4 font-bold">{payment.id}</td>
                      <td className="p-4">{payment.salesOrderId}</td>
                      <td className="p-4">{payment.customerName}</td>
                      <td className="p-4">{payment.method}</td>
                      <td className="p-4">{payment.note || "-"}</td>
                      <td className="p-4 font-black text-emerald-700">
                        {money(payment.amount)}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => printReceipt(payment)}
                            className="rounded-xl bg-black px-4 py-2 font-bold text-amber-300"
                          >
                            Print
                          </button>

                          <button
                            type="button"
                            onClick={() => deletePayment(payment)}
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

function StatCard({
  label,
  value,
  color = "text-black",
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className={`mt-2 text-3xl font-black ${color}`}>{value}</p>
    </div>
  );
}
