"use client";

import { useEffect, useMemo, useState } from "react";

type Expense = {
  id: string;
  date: string;
  category: string;
  vendor: string;
  description: string;
  amount: number;
  paymentMethod: string;
};

const categories = ["Shipping", "Rent", "Utilities", "Payroll", "Supplies", "Marketing", "Travel", "Repairs", "Software", "Other"];
const methods = ["Cash", "Credit Card", "Bank Transfer", "Check", "Other"];

function money(value: number) {
  return `$${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

function parseDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [date, setDate] = useState(todayInput());
  const [category, setCategory] = useState("Other");
  const [vendor, setVendor] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [filterCategory, setFilterCategory] = useState("All");

  useEffect(() => {
    loadExpenses();
    window.addEventListener("pageshow", loadExpenses);
    return () => window.removeEventListener("pageshow", loadExpenses);
  }, []);

  function loadExpenses() {
    try {
      const saved = localStorage.getItem("halfi_expenses");
      setExpenses(saved ? JSON.parse(saved) : []);
    } catch {
      setExpenses([]);
    }
  }

  function saveExpenses(updated: Expense[]) {
    setExpenses(updated);
    localStorage.setItem("halfi_expenses", JSON.stringify(updated));
  }

  function addExpense() {
    const expenseAmount = Number(amount || 0);

    if (!date) return alert("Date is required.");
    if (expenseAmount <= 0) return alert("Enter a valid amount.");
    if (!description.trim()) return alert("Description is required.");

    const newExpense: Expense = {
      id: `EXP-${Date.now()}`,
      date,
      category,
      vendor,
      description,
      amount: expenseAmount,
      paymentMethod,
    };

    saveExpenses([newExpense, ...expenses]);
    setDate(todayInput());
    setCategory("Other");
    setVendor("");
    setDescription("");
    setAmount("");
    setPaymentMethod("Cash");
  }

  function deleteExpense(id: string) {
    if (!confirm("Delete this expense?")) return;
    saveExpenses(expenses.filter((expense) => expense.id !== id));
  }

  const filteredExpenses = useMemo(() => {
    const list = filterCategory === "All" ? expenses : expenses.filter((expense) => expense.category === filterCategory);
    return [...list].sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime());
  }, [expenses, filterCategory]);

  const totalExpenses = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const filteredTotal = filteredExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

  const categoryTotals = categories
    .map((cat) => ({
      category: cat,
      total: expenses.filter((expense) => expense.category === cat).reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
    }))
    .filter((row) => row.total > 0)
    .sort((a, b) => b.total - a.total);

  return (
    <main className="min-h-screen bg-zinc-100 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-3xl bg-black p-8 text-white">
          <h1 className="text-4xl font-black tracking-widest text-amber-300">EXPENSES</h1>
          <p className="mt-2 text-zinc-300">Enter business expenses and see exactly what you spent money on.</p>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <StatCard label="Total Expenses" value={money(totalExpenses)} color="text-red-700" />
          <StatCard label="Filtered Total" value={money(filteredTotal)} />
          <StatCard label="Expense Entries" value={String(expenses.length)} />
        </div>

        <div className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-2xl font-bold">Add Expense</h2>

          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-2 w-full rounded-xl border px-4 py-3" /></Field>
            <Field label="Category"><select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-2 w-full rounded-xl border px-4 py-3 font-bold">{categories.map((cat) => <option key={cat}>{cat}</option>)}</select></Field>
            <Field label="Amount"><input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="mt-2 w-full rounded-xl border px-4 py-3" /></Field>
            <Field label="Vendor / Payee"><input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="Who did you pay?" className="mt-2 w-full rounded-xl border px-4 py-3" /></Field>
            <Field label="Payment Method"><select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="mt-2 w-full rounded-xl border px-4 py-3 font-bold">{methods.map((method) => <option key={method}>{method}</option>)}</select></Field>
            <Field label="Description"><input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What was this for?" className="mt-2 w-full rounded-xl border px-4 py-3" /></Field>
          </div>

          <button type="button" onClick={addExpense} className="mt-5 rounded-xl bg-black px-5 py-3 font-bold text-amber-300">Save Expense</button>
        </div>

        <div className="mb-6 grid gap-6 xl:grid-cols-2">
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-2xl font-bold">Spending by Category</h2>
            {categoryTotals.length === 0 ? <p className="text-zinc-500">No expenses yet.</p> : (
              <div className="space-y-3">{categoryTotals.map((row) => (
                <div key={row.category} className="flex items-center justify-between rounded-2xl border p-4">
                  <span className="font-bold">{row.category}</span>
                  <span className="font-black text-red-700">{money(row.total)}</span>
                </div>
              ))}</div>
            )}
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-2xl font-bold">Filter</h2>
            <label className="text-sm font-bold">Category</label>
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="mt-2 w-full rounded-xl border px-4 py-3 font-bold">
              <option value="All">All Categories</option>
              {categories.map((cat) => <option key={cat}>{cat}</option>)}
            </select>
            <p className="mt-5 rounded-2xl bg-zinc-100 p-4">Showing <b>{filteredExpenses.length}</b> expenses totaling <b>{money(filteredTotal)}</b>.</p>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-2xl font-bold">Expense History</h2>
          {filteredExpenses.length === 0 ? <p className="text-zinc-500">No expenses found.</p> : (
            <div className="overflow-x-auto rounded-2xl border">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className="bg-zinc-100 text-xs uppercase text-zinc-500">
                  <tr><th className="p-4">Date</th><th className="p-4">Category</th><th className="p-4">Vendor / Payee</th><th className="p-4">Description</th><th className="p-4">Method</th><th className="p-4">Amount</th><th className="p-4">Action</th></tr>
                </thead>
                <tbody>{filteredExpenses.map((expense) => (
                  <tr key={expense.id} className="border-t">
                    <td className="p-4">{expense.date}</td><td className="p-4 font-bold">{expense.category}</td><td className="p-4">{expense.vendor || "-"}</td><td className="p-4">{expense.description}</td><td className="p-4">{expense.paymentMethod}</td><td className="p-4 font-black text-red-700">{money(expense.amount)}</td>
                    <td className="p-4"><button type="button" onClick={() => deleteExpense(expense.id)} className="rounded-xl bg-red-600 px-4 py-2 font-bold text-white">Delete</button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="text-sm font-bold">{label}</label>{children}</div>;
}

function StatCard({ label, value, color = "text-black" }: { label: string; value: string; color?: string }) {
  return <div className="rounded-3xl bg-white p-5 shadow-sm"><p className="text-sm text-zinc-500">{label}</p><p className={`mt-2 text-3xl font-black ${color}`}>{value}</p></div>;
}
