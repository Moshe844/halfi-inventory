"use client";

import { useEffect, useMemo, useState } from "react";

type Row = {
  id: string;
  date: string;
  type: string;
  name: string;
  details: string;
  moneyIn: number;
  moneyOut: number;
  affectsCash: boolean;
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

function readLocalStorage<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

function getBillTotal(bill: any) {
  return Number(
    (bill.items || []).reduce(
      (sum: number, item: any) =>
        sum + Number(item.quantity || 0) * Number(item.unitCost || 0),
      0
    ) +
      Number(bill.extraCosts?.shippingFee || 0) +
      Number(bill.extraCosts?.insuranceFee || 0) +
      Number(bill.extraCosts?.bankFee || 0) +
      Number(bill.extraCosts?.otherFee || 0) -
      Number(bill.extraCosts?.discount || 0)
  );
}

export default function TransactionsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    loadTransactions();
    window.addEventListener("pageshow", loadTransactions);

    return () => {
      window.removeEventListener("pageshow", loadTransactions);
    };
  }, []);

  function loadTransactions() {
    const paymentsReceived = readLocalStorage<any[]>(
      "halfi_payments_received",
      []
    );
    const paymentsMade = readLocalStorage<any[]>("halfi_payments_made", []);
    const expenses = readLocalStorage<any[]>("halfi_expenses", []);
    const salesOrders = readLocalStorage<any[]>("halfi_sales_orders", []);
    const bills = readLocalStorage<any[]>("halfi_bills", []);

    const paymentInRows: Row[] = paymentsReceived.map((payment) => ({
      id: payment.id,
      date: payment.date,
      type: "Payment Received",
      name: payment.customerName || "-",
      details: `${payment.salesOrderId || ""} · ${payment.method || ""}${
        payment.note ? ` · ${payment.note}` : ""
      }`,
      moneyIn: Number(payment.amount || 0),
      moneyOut: 0,
      affectsCash: true,
    }));

    const paymentOutRows: Row[] = paymentsMade.map((payment) => ({
      id: payment.id,
      date: payment.date,
      type: "Payment Made",
      name: payment.vendor || "-",
      details: `${payment.billId || payment.poId || ""} · ${
        payment.method || ""
      }${payment.note ? ` · ${payment.note}` : ""}`,
      moneyIn: 0,
      moneyOut: Number(payment.amount || 0),
      affectsCash: true,
    }));

    const expenseRows: Row[] = expenses.map((expense) => ({
      id: expense.id,
      date: expense.date,
      type: "Expense",
      name: expense.vendor || expense.category || "-",
      details: `${expense.category || ""}${
        expense.description ? ` · ${expense.description}` : ""
      }`,
      moneyIn: 0,
      moneyOut: Number(expense.amount || 0),
      affectsCash: true,
    }));

    const saleRows: Row[] = salesOrders
      .filter((order) => order.status !== "Cancelled")
      .map((order) => ({
        id: order.id,
        date: order.date,
        type: "Sale / Invoice",
        name: order.customerName || "-",
        details: `${(order.items || []).length} item lines · Invoice total ${money(
          Number(order.subtotal || 0)
        )}`,
        moneyIn: 0,
        moneyOut: 0,
        affectsCash: false,
      }));

    const billRows: Row[] = bills.map((bill) => ({
      id: bill.id,
      date: bill.date,
      type: "Vendor Bill",
      name: bill.vendor || "-",
      details: `${bill.poId || ""} · Bill total ${money(getBillTotal(bill))}`,
      moneyIn: 0,
      moneyOut: 0,
      affectsCash: false,
    }));

    const allRows = [
      ...paymentInRows,
      ...paymentOutRows,
      ...expenseRows,
      ...saleRows,
      ...billRows,
    ].sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime());

    setRows(allRows);
  }

  const filteredRows = useMemo(() => {
    if (filter === "All") return rows;
    return rows.filter((row) => row.type === filter);
  }, [rows, filter]);

  const cashRows = filteredRows.filter((row) => row.affectsCash);
  const moneyIn = cashRows.reduce((sum, row) => sum + row.moneyIn, 0);
  const moneyOut = cashRows.reduce((sum, row) => sum + row.moneyOut, 0);
  const net = moneyIn - moneyOut;
  const nonCashRows = filteredRows.filter((row) => !row.affectsCash).length;

  const transactionTypes = [
    "All",
    ...Array.from(new Set(rows.map((row) => row.type))),
  ];

  return (
    <main className="min-h-screen bg-zinc-100 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-3xl bg-black p-8 text-white">
          <h1 className="text-4xl font-black tracking-widest text-amber-300">
            TRANSACTIONS
          </h1>
          <p className="mt-2 text-zinc-300">
            Real cash movement plus invoice and bill history. Cash totals only
            count actual payments and expenses.
          </p>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <StatCard
            label="Cash In"
            value={money(moneyIn)}
            color="text-emerald-700"
          />

          <StatCard
            label="Cash Out"
            value={money(moneyOut)}
            color="text-red-700"
          />

          <StatCard
            label="Net Cash"
            value={money(net)}
            color={net >= 0 ? "text-emerald-700" : "text-red-700"}
          />

          <StatCard label="Transactions" value={String(filteredRows.length)} />
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <label className="text-sm font-bold">Filter Transaction Type</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="mt-2 w-full rounded-xl border px-4 py-3 font-bold"
            >
              {transactionTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black">How this page calculates</h2>
            <p className="mt-2 text-sm text-zinc-600">
              Cash In counts only customer payments received. Cash Out counts
              only vendor payments made and manual expenses. Sales / Invoices and
              Vendor Bills are shown for history, but they do not affect cash
              totals until paid.
            </p>
            <p className="mt-3 rounded-xl bg-zinc-100 p-3 text-sm">
              Non-cash rows currently shown: <b>{nonCashRows}</b>
            </p>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-2xl font-bold">Transaction History</h2>

          {filteredRows.length === 0 ? (
            <p className="text-zinc-500">No transactions yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead className="bg-zinc-100 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="p-4">Date</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Name</th>
                    <th className="p-4">Details</th>
                    <th className="p-4">Cash In</th>
                    <th className="p-4">Cash Out</th>
                    <th className="p-4">Net Cash</th>
                    <th className="p-4">Cash?</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRows.map((row) => {
                    const rowNet = row.affectsCash
                      ? row.moneyIn - row.moneyOut
                      : 0;

                    return (
                      <tr key={`${row.type}-${row.id}`} className="border-t">
                        <td className="p-4">{row.date}</td>
                        <td className="p-4 font-bold">{row.type}</td>
                        <td className="p-4">{row.name}</td>
                        <td className="p-4">{row.details || "-"}</td>
                        <td className="p-4 font-bold text-emerald-700">
                          {row.moneyIn ? money(row.moneyIn) : "-"}
                        </td>
                        <td className="p-4 font-bold text-red-700">
                          {row.moneyOut ? money(row.moneyOut) : "-"}
                        </td>
                        <td
                          className={`p-4 font-black ${
                            rowNet >= 0 ? "text-emerald-700" : "text-red-700"
                          }`}
                        >
                          {row.affectsCash ? money(rowNet) : "-"}
                        </td>
                        <td className="p-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                              row.affectsCash
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-zinc-100 text-zinc-600"
                            }`}
                          >
                            {row.affectsCash ? "Cash" : "Non-cash"}
                          </span>
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
