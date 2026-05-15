"use client";

import { useEffect, useMemo, useState } from "react";

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
  status: "Draft" | "Completed" | "Cancelled";
  items: SalesOrderItem[];
  subtotal: number;
};

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

type PurchaseOrder = {
  id: string;
  vendor: string;
  date: string;
  status: string;
  amountPaid?: number;
  extraCosts?: ExtraCosts;
  items: POItem[];
};

type Bill = {
  id: string;
  poId: string;
  vendor: string;
  date: string;
  status: string;
  amountPaid: number;
  extraCosts?: ExtraCosts;
  items: POItem[];
};

type PaymentMade = {
  id: string;
  billId?: string;
  poId?: string;
  vendor?: string;
  date: string;
  amount: number;
  method?: string;
  note?: string;
};

type Expense = {
  id: string;
  date: string;
  category?: string;
  vendor?: string;
  description?: string;
  amount: number;
};

type FinancialRow = {
  id: string;
  date: string;
  type: "Sale" | "Purchase Payment" | "Expense";
  name: string;
  details: string;
  moneyIn: number;
  moneyOut: number;
  profit: number;
};

const defaultExtraCosts: ExtraCosts = {
  shippingFee: 0,
  insuranceFee: 0,
  bankFee: 0,
  otherFee: 0,
  discount: 0,
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

function dateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function displayDate(value: string) {
  const date = parseDate(value);
  if (date.getTime() === 0) return value || "-";
  return date.toLocaleDateString();
}

function inRange(dateString: string, start: string, end: string) {
  const date = parseDate(dateString);
  const startDate = start ? new Date(start + "T00:00:00") : new Date(0);
  const endDate = end ? new Date(end + "T23:59:59") : new Date(8640000000000000);

  return date >= startDate && date <= endDate;
}

function getItemSubtotal(items: POItem[]) {
  return items.reduce(
    (sum, item) =>
      sum + Number(item.quantity || 0) * Number(item.unitCost || 0),
    0
  );
}

function getExtraCosts(record: { extraCosts?: ExtraCosts }) {
  return record.extraCosts || defaultExtraCosts;
}

function getGrandTotal(record: { items: POItem[]; extraCosts?: ExtraCosts }) {
  const costs = getExtraCosts(record);

  return (
    getItemSubtotal(record.items) +
    Number(costs.shippingFee || 0) +
    Number(costs.insuranceFee || 0) +
    Number(costs.bankFee || 0) +
    Number(costs.otherFee || 0) -
    Number(costs.discount || 0)
  );
}

function getSaleCost(order: SalesOrder) {
  return order.items.reduce(
    (sum, item) =>
      sum + Number(item.quantity || 0) * Number(item.unitCost || 0),
    0
  );
}

function getSaleRevenue(order: SalesOrder) {
  return Number(
    order.subtotal ||
      order.items.reduce(
        (sum, item) =>
          sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
        0
      )
  );
}

function readLocalStorage<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

export default function FinancialReportsPage() {
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [paymentsMade, setPaymentsMade] = useState<PaymentMade[]>([]);
  const [paymentsReceived, setPaymentsReceived] = useState<PaymentMade[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

  const [startDate, setStartDate] = useState(dateInputValue(firstDay));
  const [endDate, setEndDate] = useState(dateInputValue(today));
  const [view, setView] = useState<"summary" | "sales" | "spending" | "profit" | "all">("summary");

  useEffect(() => {
    loadData();
    window.addEventListener("pageshow", loadData);

    return () => {
      window.removeEventListener("pageshow", loadData);
    };
  }, []);

  function loadData() {
    setSalesOrders(readLocalStorage<SalesOrder[]>("halfi_sales_orders", []));
    setPurchaseOrders(readLocalStorage<PurchaseOrder[]>("halfi_purchase_orders", []));
    setBills(readLocalStorage<Bill[]>("halfi_bills", []));
    setPaymentsMade(readLocalStorage<PaymentMade[]>("halfi_payments_made", []));
    setPaymentsReceived(readLocalStorage<PaymentMade[]>("halfi_payments_received", []));
    setExpenses(readLocalStorage<Expense[]>("halfi_expenses", []));
  }

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

  const filteredSales = useMemo(
    () =>
      salesOrders.filter(
        (order) =>
          order.status !== "Cancelled" && inRange(order.date, startDate, endDate)
      ),
    [salesOrders, startDate, endDate]
  );

  const filteredPaymentsMade = useMemo(
    () => paymentsMade.filter((payment) => inRange(payment.date, startDate, endDate)),
    [paymentsMade, startDate, endDate]
  );

  const filteredPaymentsReceived = useMemo(
    () => paymentsReceived.filter((payment) => inRange(payment.date, startDate, endDate)),
    [paymentsReceived, startDate, endDate]
  );

  const filteredExpenses = useMemo(
    () => expenses.filter((expense) => inRange(expense.date, startDate, endDate)),
    [expenses, startDate, endDate]
  );

  const salesRevenue = filteredSales.reduce((sum, order) => sum + getSaleRevenue(order), 0);
  const paymentsCollected = filteredPaymentsReceived.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const customerOwes = filteredSales.reduce((sum, order: any) => {
    const paid = typeof order.amountPaid === "number"
      ? Number(order.amountPaid || 0)
      : (order.payments || []).reduce((pSum: number, payment: any) => pSum + Number(payment.amount || 0), 0);

    return sum + Math.max(getSaleRevenue(order) - paid, 0);
  }, 0);

  const costOfSoldItems = filteredSales.reduce((sum, order) => sum + getSaleCost(order), 0);
  const expectedGrossProfit = salesRevenue - costOfSoldItems;
  const cashProfitCollected = paymentsCollected - costOfSoldItems;

  const vendorPayments = filteredPaymentsMade.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const manualExpenses = filteredExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const totalCashOut = vendorPayments + manualExpenses;
  const cashAfterAllPayments = paymentsCollected - totalCashOut;
  const expectedProfitAfterExpenses = expectedGrossProfit - manualExpenses;
  const cashProfitAfterExpenses = cashProfitCollected - manualExpenses;

  const unpaidBills = bills.reduce((sum, bill) => {
    const owed = getGrandTotal(bill) - Number(bill.amountPaid || 0);
    return sum + Math.max(owed, 0);
  }, 0);

  const totalInventoryPurchased = purchaseOrders.reduce((sum, po) => sum + getGrandTotal(po), 0);

  const salesRows: FinancialRow[] = filteredSales.map((order) => {
    const revenue = getSaleRevenue(order);
    const cost = getSaleCost(order);

    return {
      id: order.id,
      date: order.date,
      type: "Sale",
      name: order.customerName,
      details: `${order.items.length} item lines · Cost ${money(cost)}`,
      moneyIn: revenue,
      moneyOut: 0,
      profit: revenue - cost,
    };
  });

  const paymentRows: FinancialRow[] = filteredPaymentsMade.map((payment) => ({
    id: payment.id,
    date: payment.date,
    type: "Purchase Payment",
    name: payment.vendor || "-",
    details: `${payment.method || "-"} · ${payment.note || payment.billId || payment.poId || ""}`,
    moneyIn: 0,
    moneyOut: Number(payment.amount || 0),
    profit: -Number(payment.amount || 0),
  }));

  const receivedRows: FinancialRow[] = filteredPaymentsReceived.map((payment: any) => ({
    id: payment.id,
    date: payment.date,
    type: "Sale",
    name: payment.customerName || "-",
    details: `Payment received · ${payment.method || "-"} · ${payment.salesOrderId || ""}`,
    moneyIn: Number(payment.amount || 0),
    moneyOut: 0,
    profit: Number(payment.amount || 0),
  }));

  const expenseRows: FinancialRow[] = filteredExpenses.map((expense) => ({
    id: expense.id,
    date: expense.date,
    type: "Expense",
    name: expense.vendor || expense.category || "Expense",
    details: expense.description || expense.category || "-",
    moneyIn: 0,
    moneyOut: Number(expense.amount || 0),
    profit: -Number(expense.amount || 0),
  }));

  const allRows = [...receivedRows, ...paymentRows, ...expenseRows].sort(
    (a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime()
  );

  const profitByProduct = useMemo(() => {
    const map = new Map<
      string,
      { product: string; sku: string; qty: number; revenue: number; cost: number; profit: number }
    >();

    filteredSales.forEach((order) => {
      order.items.forEach((item) => {
        const key = `${item.productName}|${item.sku || ""}|${item.size || ""}`;
        const current =
          map.get(key) ||
          {
            product: item.productName,
            sku: item.sku || "-",
            qty: 0,
            revenue: 0,
            cost: 0,
            profit: 0,
          };

        const revenue = Number(item.quantity || 0) * Number(item.unitPrice || 0);
        const cost = Number(item.quantity || 0) * Number(item.unitCost || 0);

        current.qty += Number(item.quantity || 0);
        current.revenue += revenue;
        current.cost += cost;
        current.profit += revenue - cost;

        map.set(key, current);
      });
    });

    return [...map.values()].sort((a, b) => b.profit - a.profit);
  }, [filteredSales]);

  const spendingByVendor = useMemo(() => {
    const map = new Map<string, number>();

    filteredPaymentsMade.forEach((payment) => {
      const vendor = payment.vendor || "Unknown";
      map.set(vendor, (map.get(vendor) || 0) + Number(payment.amount || 0));
    });

    filteredExpenses.forEach((expense) => {
      const vendor = expense.vendor || expense.category || "Other Expenses";
      map.set(vendor, (map.get(vendor) || 0) + Number(expense.amount || 0));
    });

    return [...map.entries()]
      .map(([vendor, amount]) => ({ vendor, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredPaymentsMade, filteredExpenses]);

  function printReport() {
    window.print();
  }

  function downloadCsv() {
    const rows = [
      ["Date", "Type", "Name", "Details", "Money In", "Money Out", "Profit"],
      ...allRows.map((row) => [
        displayDate(row.date),
        row.type,
        row.name,
        row.details,
        row.moneyIn,
        row.moneyOut,
        row.profit,
      ]),
    ];

    const csv = rows
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `halfi-financial-report-${startDate || "all"}-${endDate || "all"}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-zinc-100 p-6 print:bg-white print:p-0">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }

          #financial-print-area,
          #financial-print-area * {
            visibility: visible;
          }

          #financial-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }

          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div id="financial-print-area" className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-3xl bg-black p-8 text-white print:rounded-none">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-zinc-400">
            Halfi Inventory System
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-widest text-amber-300">
            FINANCIAL REPORTS
          </h1>
          <p className="mt-2 text-zinc-300">
            Profit, sales, spending, vendor payments, expenses, and cash flow.
          </p>
        </div>

        <div className="no-print mb-6 rounded-3xl bg-white p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-5">
            <div>
              <label className="text-sm font-bold">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-2 w-full rounded-xl border px-4 py-3"
              />
            </div>

            <div>
              <label className="text-sm font-bold">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-2 w-full rounded-xl border px-4 py-3"
              />
            </div>

            <button type="button" onClick={setThisMonth} className="mt-7 rounded-xl bg-zinc-100 px-4 py-3 font-bold">
              This Month
            </button>

            <button type="button" onClick={setThisYear} className="mt-7 rounded-xl bg-zinc-100 px-4 py-3 font-bold">
              This Year
            </button>

            <button type="button" onClick={setAllTime} className="mt-7 rounded-xl bg-zinc-100 px-4 py-3 font-bold">
              All Time
            </button>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            {[
              ["summary", "Summary"],
              ["sales", "Sales"],
              ["spending", "Spending"],
              ["profit", "Profit by Product"],
              ["all", "All Transactions"],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setView(key as any)}
                className={`rounded-xl px-5 py-3 font-bold ${
                  view === key ? "bg-black text-amber-300" : "bg-zinc-100 text-black"
                }`}
              >
                {label}
              </button>
            ))}

            <button type="button" onClick={printReport} className="rounded-xl bg-amber-400 px-5 py-3 font-bold text-black">
              Print Report
            </button>

            <button type="button" onClick={downloadCsv} className="rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white">
              Export CSV
            </button>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Sales Revenue" value={money(salesRevenue)} color="text-emerald-700" />
          <StatCard label="Cost of Sold Items" value={money(costOfSoldItems)} color="text-red-700" />
          <StatCard label="Expected Profit" value={money(expectedGrossProfit)} color={expectedGrossProfit >= 0 ? "text-emerald-700" : "text-red-700"} />
          <StatCard label="Cash Profit Collected" value={money(cashProfitCollected)} color={cashProfitCollected >= 0 ? "text-emerald-700" : "text-red-700"} />
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Payments Collected" value={money(paymentsCollected)} color="text-emerald-700" />
          <StatCard label="Customer Still Owes" value={money(customerOwes)} color="text-amber-700" />
          <StatCard label="Vendor/Expense Cash Out" value={money(totalCashOut)} color="text-red-700" />
          <StatCard label="Cash After All Payments" value={money(cashAfterAllPayments)} color={cashAfterAllPayments >= 0 ? "text-emerald-700" : "text-red-700"} />
        </div>

        <div className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-2xl font-black">Plain English Summary</h2>

          <div className="grid gap-3 md:grid-cols-2">
            <p className="rounded-2xl bg-zinc-100 p-4">
              You invoiced/sold <b>{money(salesRevenue)}</b> in this date range and collected <b>{money(paymentsCollected)}</b>.
            </p>
            <p className="rounded-2xl bg-zinc-100 p-4">
              The estimated cost of those sold items was <b>{money(costOfSoldItems)}</b>.
            </p>
            <p className="rounded-2xl bg-zinc-100 p-4">
              Expected profit after customer pays everything is <b>{money(expectedGrossProfit)}</b>.
            </p>
            <p className="rounded-2xl bg-zinc-100 p-4">
              Cash profit based on money actually collected is <b>{money(cashProfitCollected)}</b>.
            </p>
            <p className="rounded-2xl bg-zinc-100 p-4">
              Customers still owe you <b>{money(customerOwes)}</b> in this date range.
            </p>
            <p className="rounded-2xl bg-zinc-100 p-4">
              After vendor/expense payments, cash position is <b>{money(cashAfterAllPayments)}</b>.
            </p>
          </div>
        </div>

        {(view === "summary" || view === "sales") && (
          <ReportTable title="Sales" rows={salesRows} empty="No sales found in this date range." />
        )}

        {(view === "summary" || view === "spending") && (
          <div className="mb-6 grid gap-6 xl:grid-cols-2">
            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-2xl font-black">Spending by Vendor / Category</h2>

              {spendingByVendor.length === 0 ? (
                <p className="text-zinc-500">No spending found in this range.</p>
              ) : (
                <div className="space-y-3">
                  {spendingByVendor.map((row) => (
                    <div key={row.vendor} className="flex items-center justify-between rounded-2xl border p-4">
                      <span className="font-bold">{row.vendor}</span>
                      <span className="font-black">{money(row.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <ReportTable
              title="Vendor Payments / Expenses"
              rows={[...paymentRows, ...expenseRows].sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime())}
              empty="No payments or expenses found in this date range."
            />
          </div>
        )}

        {(view === "summary" || view === "profit") && (
          <div className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-2xl font-black">Profit by Product</h2>

            {profitByProduct.length === 0 ? (
              <p className="text-zinc-500">No product profit found in this range.</p>
            ) : (
              <div className="overflow-x-auto rounded-2xl border">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="bg-zinc-100 text-xs uppercase text-zinc-500">
                    <tr>
                      <th className="p-4">Product</th>
                      <th className="p-4">SKU</th>
                      <th className="p-4">Qty Sold</th>
                      <th className="p-4">Sales</th>
                      <th className="p-4">Cost</th>
                      <th className="p-4">Profit</th>
                      <th className="p-4">Margin</th>
                    </tr>
                  </thead>

                  <tbody>
                    {profitByProduct.map((item) => {
                      const margin = item.revenue > 0 ? (item.profit / item.revenue) * 100 : 0;

                      return (
                        <tr key={`${item.product}-${item.sku}`} className="border-t">
                          <td className="p-4 font-bold">{item.product}</td>
                          <td className="p-4">{item.sku}</td>
                          <td className="p-4 font-black">{item.qty}</td>
                          <td className="p-4">{money(item.revenue)}</td>
                          <td className="p-4">{money(item.cost)}</td>
                          <td className={`p-4 font-black ${item.profit >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                            {money(item.profit)}
                          </td>
                          <td className="p-4">{margin.toFixed(1)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {view === "all" && (
          <ReportTable title="All Transactions" rows={allRows} empty="No transactions found in this date range." />
        )}
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

function ReportTable({ title, rows, empty }: { title: string; rows: FinancialRow[]; empty: string }) {
  return (
    <div className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-2xl font-black">{title}</h2>

      {rows.length === 0 ? (
        <p className="text-zinc-500">{empty}</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="bg-zinc-100 text-xs uppercase text-zinc-500">
              <tr>
                <th className="p-4">Date</th>
                <th className="p-4">Type</th>
                <th className="p-4">Name</th>
                <th className="p-4">Details</th>
                <th className="p-4">Money In</th>
                <th className="p-4">Money Out</th>
                <th className="p-4">Profit / Effect</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => (
                <tr key={`${row.type}-${row.id}`} className="border-t">
                  <td className="p-4">{displayDate(row.date)}</td>
                  <td className="p-4 font-bold">{row.type}</td>
                  <td className="p-4">{row.name}</td>
                  <td className="p-4">{row.details}</td>
                  <td className="p-4 font-bold text-emerald-700">
                    {row.moneyIn ? money(row.moneyIn) : "-"}
                  </td>
                  <td className="p-4 font-bold text-red-700">
                    {row.moneyOut ? money(row.moneyOut) : "-"}
                  </td>
                  <td className={`p-4 font-black ${row.profit >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                    {money(row.profit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
