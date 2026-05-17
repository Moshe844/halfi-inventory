"use client";

import { useEffect, useMemo, useState } from "react";

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
  status: string;
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

  const parts = String(value || "").split("/");
  if (parts.length === 3) {
    const [month, day, year] = parts.map(Number);
    return new Date(year, month - 1, day);
  }

  return new Date(0);
}

function dateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function inRange(dateString: string, start: string, end: string) {
  const date = parseDate(dateString);
  const startDate = start ? new Date(start + "T00:00:00") : new Date(0);
  const endDate = end ? new Date(end + "T23:59:59") : new Date(8640000000000000);

  return date >= startDate && date <= endDate;
}

function displayDate(value: string) {
  const date = parseDate(value);
  if (date.getTime() === 0) return value || "-";
  return date.toLocaleDateString();
}

function readLocalStorage<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

function getOrderTotal(order: SalesOrder) {
  return Number(
    order.subtotal ||
      (order.items || []).reduce(
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

function getOrderCost(order: SalesOrder) {
  return (order.items || []).reduce(
    (sum, item) =>
      sum + Number(item.quantity || 0) * Number(item.unitCost || 0),
    0
  );
}

export default function SalesReportsPage() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [payments, setPayments] = useState<PaymentReceived[]>([]);

  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

  const [startDate, setStartDate] = useState(dateInputValue(firstDay));
  const [endDate, setEndDate] = useState(dateInputValue(today));

  useEffect(() => {
    loadData();
    window.addEventListener("pageshow", loadData);
    return () => window.removeEventListener("pageshow", loadData);
  }, []);

  function loadData() {
    setOrders(readLocalStorage<SalesOrder[]>("halfi_sales_orders", []));
    setPayments(readLocalStorage<PaymentReceived[]>("halfi_payments_received", []));
  }

  const filteredOrders = orders.filter(
    (order) => order.status !== "Cancelled" && inRange(order.date, startDate, endDate)
  );

  const filteredPayments = payments.filter((payment) =>
    inRange(payment.date, startDate, endDate)
  );

  const salesTotal = filteredOrders.reduce((sum, order) => sum + getOrderTotal(order), 0);
  const paidTotal = filteredPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const outstandingTotal = filteredOrders.reduce((sum, order) => sum + getOrderBalance(order), 0);
  const costTotal = filteredOrders.reduce((sum, order) => sum + getOrderCost(order), 0);
  const grossProfit = salesTotal - costTotal;

  const totalQtySold = filteredOrders.reduce(
    (sum, order) =>
      sum +
      (order.items || []).reduce(
        (itemSum, item) => itemSum + Number(item.quantity || 0),
        0
      ),
    0
  );

  const avgOrderValue = filteredOrders.length > 0 ? salesTotal / filteredOrders.length : 0;

  const customerSales = useMemo(() => {
    const map = new Map<
      string,
      { customer: string; orders: number; sales: number; paid: number; balance: number }
    >();

    filteredOrders.forEach((order) => {
      const current =
        map.get(order.customerName) ||
        { customer: order.customerName, orders: 0, sales: 0, paid: 0, balance: 0 };

      current.orders += 1;
      current.sales += getOrderTotal(order);
      current.paid += getOrderPaid(order);
      current.balance += getOrderBalance(order);

      map.set(order.customerName, current);
    });

    return [...map.values()].sort((a, b) => b.sales - a.sales);
  }, [filteredOrders]);

  const productSales = useMemo(() => {
    const map = new Map<
      string,
      {
        product: string;
        model: string;
        sku: string;
        size: string;
        qty: number;
        sales: number;
        cost: number;
        profit: number;
      }
    >();

    filteredOrders.forEach((order) => {
      (order.items || []).forEach((item) => {
        const key = `${item.productName}|${item.modelNo || ""}|${item.sku || ""}|${item.size || ""}`;

        const current =
          map.get(key) ||
          {
            product: item.productName,
            model: item.modelNo || "-",
            sku: item.sku || "-",
            size: item.size || "-",
            qty: 0,
            sales: 0,
            cost: 0,
            profit: 0,
          };

        const qty = Number(item.quantity || 0);
        const sales = qty * Number(item.unitPrice || 0);
        const cost = qty * Number(item.unitCost || 0);

        current.qty += qty;
        current.sales += sales;
        current.cost += cost;
        current.profit += sales - cost;

        map.set(key, current);
      });
    });

    return [...map.values()].sort((a, b) => b.sales - a.sales);
  }, [filteredOrders]);

  const dailySales = useMemo(() => {
    const map = new Map<string, { date: string; orders: number; sales: number; paid: number }>();

    filteredOrders.forEach((order) => {
      const key = displayDate(order.date);
      const current = map.get(key) || { date: key, orders: 0, sales: 0, paid: 0 };

      current.orders += 1;
      current.sales += getOrderTotal(order);

      map.set(key, current);
    });

    filteredPayments.forEach((payment) => {
      const key = displayDate(payment.date);
      const current = map.get(key) || { date: key, orders: 0, sales: 0, paid: 0 };

      current.paid += Number(payment.amount || 0);

      map.set(key, current);
    });

    return [...map.values()].sort(
      (a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime()
    );
  }, [filteredOrders, filteredPayments]);

  function setThisMonth() {
    setStartDate(dateInputValue(firstDay));
    setEndDate(dateInputValue(today));
  }

  function setThisYear() {
    setStartDate(dateInputValue(new Date(today.getFullYear(), 0, 1)));
    setEndDate(dateInputValue(today));
  }

  function setAllTime() {
    setStartDate("");
    setEndDate("");
  }

  return (
    <main className="min-h-screen bg-zinc-100 p-6 print:bg-white">
      <style>{`@media print { .no-print { display: none !important; } body { background: white !important; } }`}</style>

      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-3xl bg-black p-8 text-white print:rounded-none">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-zinc-400">
            Halfi Inventory System
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-widest text-amber-300">
            SALES REPORTS
          </h1>
          <p className="mt-2 text-zinc-300">
            Sales, payments collected, customer balances, product sales, and profit.
          </p>
        </div>

        <div className="no-print mb-6 rounded-3xl bg-white p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-5">
            <div>
              <label className="text-sm font-bold">Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-2 w-full rounded-xl border px-4 py-3" />
            </div>

            <div>
              <label className="text-sm font-bold">End Date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-2 w-full rounded-xl border px-4 py-3" />
            </div>

            <button type="button" onClick={setThisMonth} className="mt-7 rounded-xl bg-zinc-100 px-4 py-3 font-bold">This Month</button>
            <button type="button" onClick={setThisYear} className="mt-7 rounded-xl bg-zinc-100 px-4 py-3 font-bold">This Year</button>
            <button type="button" onClick={setAllTime} className="mt-7 rounded-xl bg-zinc-100 px-4 py-3 font-bold">All Time</button>
          </div>

          <div className="mt-5 flex gap-3">
            <button type="button" onClick={() => window.print()} className="rounded-xl bg-black px-5 py-3 font-bold text-amber-300">Print Report</button>
            <button type="button" onClick={loadData} className="rounded-xl bg-zinc-200 px-5 py-3 font-bold">Refresh</button>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Sales Total" value={money(salesTotal)} />
          <StatCard label="Payments Collected" value={money(paidTotal)} color="text-emerald-700" />
          <StatCard label="Customer Owes" value={money(outstandingTotal)} color="text-amber-700" />
          <StatCard label="Gross Profit" value={money(grossProfit)} color={grossProfit >= 0 ? "text-emerald-700" : "text-red-700"} />
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Orders" value={String(filteredOrders.length)} />
          <StatCard label="Qty Sold" value={String(totalQtySold)} />
          <StatCard label="Average Order" value={money(avgOrderValue)} />
          <StatCard label="Cost of Sold Items" value={money(costTotal)} />
        </div>

        <TableCard title="Customer Sales">
          {customerSales.length === 0 ? (
            <p className="text-zinc-500">No customer sales in this range.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-zinc-100 text-xs uppercase text-zinc-500">
                  <tr><th className="p-4">Customer</th><th className="p-4">Orders</th><th className="p-4">Sales</th><th className="p-4">Paid</th><th className="p-4">Balance</th></tr>
                </thead>
                <tbody>
                  {customerSales.map((row) => (
                    <tr key={row.customer} className="border-t">
                      <td className="p-4 font-bold">{row.customer}</td>
                      <td className="p-4">{row.orders}</td>
                      <td className="p-4">{money(row.sales)}</td>
                      <td className="p-4 font-bold text-emerald-700">{money(row.paid)}</td>
                      <td className="p-4 font-bold text-amber-700">{money(row.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TableCard>

        <TableCard title="Product / SKU Sales">
          {productSales.length === 0 ? (
            <p className="text-zinc-500">No product sales in this range.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className="bg-zinc-100 text-xs uppercase text-zinc-500">
                  <tr><th className="p-4">Product</th><th className="p-4">Model</th><th className="p-4">SKU</th><th className="p-4">Size</th><th className="p-4">Qty</th><th className="p-4">Sales</th><th className="p-4">Cost</th><th className="p-4">Profit</th></tr>
                </thead>
                <tbody>
                  {productSales.map((item) => (
                    <tr key={`${item.product}-${item.model}-${item.sku}-${item.size}`} className="border-t">
                      <td className="p-4 font-bold">{item.product}</td>
                      <td className="p-4">{item.model}</td>
                      <td className="p-4">{item.sku}</td>
                      <td className="p-4">{item.size}</td>
                      <td className="p-4 font-black">{item.qty}</td>
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

        <TableCard title="Daily Sales / Payments">
          {dailySales.length === 0 ? (
            <p className="text-zinc-500">No daily sales in this range.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-zinc-100 text-xs uppercase text-zinc-500">
                  <tr><th className="p-4">Date</th><th className="p-4">Orders</th><th className="p-4">Sales</th><th className="p-4">Collected</th></tr>
                </thead>
                <tbody>
                  {dailySales.map((row) => (
                    <tr key={row.date} className="border-t">
                      <td className="p-4 font-bold">{row.date}</td>
                      <td className="p-4">{row.orders}</td>
                      <td className="p-4">{money(row.sales)}</td>
                      <td className="p-4 font-bold text-emerald-700">{money(row.paid)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TableCard>

        <TableCard title="Sales Order Details">
          {filteredOrders.length === 0 ? (
            <p className="text-zinc-500">No sales orders in this range.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className="bg-zinc-100 text-xs uppercase text-zinc-500">
                  <tr><th className="p-4">SO / Invoice</th><th className="p-4">Date</th><th className="p-4">Customer</th><th className="p-4">Items</th><th className="p-4">Total</th><th className="p-4">Paid</th><th className="p-4">Balance</th><th className="p-4">Profit</th></tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => {
                    const total = getOrderTotal(order);
                    const paid = getOrderPaid(order);
                    const balance = getOrderBalance(order);
                    const profit = total - getOrderCost(order);

                    return (
                      <tr key={order.id} className="border-t">
                        <td className="p-4 font-bold">{order.id}</td>
                        <td className="p-4">{displayDate(order.date)}</td>
                        <td className="p-4">{order.customerName}</td>
                        <td className="p-4">{order.items?.length || 0}</td>
                        <td className="p-4">{money(total)}</td>
                        <td className="p-4 font-bold text-emerald-700">{money(paid)}</td>
                        <td className="p-4 font-bold text-amber-700">{money(balance)}</td>
                        <td className={`p-4 font-black ${profit >= 0 ? "text-emerald-700" : "text-red-700"}`}>{money(profit)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TableCard>
      </div>
    </main>
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
