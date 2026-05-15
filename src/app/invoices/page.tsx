"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type PaymentReceived = {
  id: string;
  salesOrderId: string;
  customerName: string;
  date: string;
  amount: number;
  method: string;
  note?: string;
};

type SalesOrderItem = {
  id: string;
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

export default function InvoicesPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<SalesOrder[]>([]);

  useEffect(() => {
    loadData();
    window.addEventListener("pageshow", loadData);

    return () => {
      window.removeEventListener("pageshow", loadData);
    };
  }, []);

  function loadData() {
    try {
      const saved = localStorage.getItem("halfi_sales_orders");
      setOrders(saved ? JSON.parse(saved) : []);
    } catch {
      setOrders([]);
    }
  }

  const activeInvoices = orders.filter((order) => order.status !== "Cancelled");
  const invoiceTotal = activeInvoices.reduce((sum, order) => sum + getOrderTotal(order), 0);
  const invoicePaid = activeInvoices.reduce((sum, order) => sum + getOrderPaid(order), 0);
  const invoiceOwed = activeInvoices.reduce((sum, order) => sum + getOrderBalance(order), 0);

  function openSalesOrder() {
    router.push("/sales-orders");
  }

  return (
    <main className="min-h-screen bg-zinc-100 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-3xl bg-black p-8 text-white">
          <h1 className="text-4xl font-black tracking-widest text-amber-300">
            INVOICES
          </h1>
          <p className="mt-2 text-zinc-300">
            In this system, every completed sales order is the customer invoice.
          </p>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <StatCard label="Invoices" value={String(activeInvoices.length)} />
          <StatCard label="Invoice Total" value={money(invoiceTotal)} />
          <StatCard label="Paid" value={money(invoicePaid)} color="text-emerald-700" />
          <StatCard label="Open Balance" value={money(invoiceOwed)} color="text-amber-700" />
        </div>

        <div className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black">Invoice List</h2>
              <p className="mt-1 text-zinc-500">
                To create a new invoice, create a sale from Sales Orders.
              </p>
            </div>

            <button
              type="button"
              onClick={openSalesOrder}
              className="rounded-xl bg-black px-5 py-3 font-bold text-amber-300"
            >
              Go to Sales Orders
            </button>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          {activeInvoices.length === 0 ? (
            <p className="text-zinc-500">No invoices yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-zinc-100 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="p-4">Invoice / SO #</th>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Total</th>
                    <th className="p-4">Paid</th>
                    <th className="p-4">Balance</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {activeInvoices.map((order) => (
                    <tr key={order.id} className="border-t">
                      <td className="p-4 font-black">{order.id}</td>
                      <td className="p-4">{order.customerName}</td>
                      <td className="p-4">{order.date}</td>
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
