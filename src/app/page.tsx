"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Boxes,
  ClipboardList,
  DollarSign,
  FileText,
  PackageCheck,
  Plus,
  ShoppingCart,
  Truck,
  Users,
  Wallet,
  Warehouse,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

type InventoryItem = {
  id: string;
  productName: string;
  modelNo?: string;
  sku?: string;
  size?: string;
  quantity?: number;
  inStockQty?: number;
  unitCost?: number;
  sellingPrice?: number;
  status?: string;
};

type PurchaseOrder = {
  id: string;
  vendor: string;
  date: string;
  status: string;
  amountPaid?: number;
  items: any[];
  extraCosts?: {
    shippingFee?: number;
    insuranceFee?: number;
    bankFee?: number;
    otherFee?: number;
    discount?: number;
  };
};

type SalesOrder = {
  id: string;
  customerName: string;
  date: string;
  status: string;
  subtotal?: number;
  amountPaid?: number;
  items: any[];
  payments?: any[];
};

type Payment = {
  id: string;
  amount: number;
  date: string;
};

type Expense = {
  id: string;
  amount: number;
  category?: string;
  description?: string;
  date: string;
};

function readLocalStorage<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

function money(value: number) {
  return `$${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function getStockQty(item: InventoryItem) {
  return Number(item.quantity ?? item.inStockQty ?? 0);
}

function getItemSubtotal(items: any[]) {
  return (items || []).reduce(
    (sum, item) =>
      sum + Number(item.quantity || 0) * Number(item.unitCost || 0),
    0
  );
}

function getPOGrandTotal(order: PurchaseOrder) {
  const costs = order.extraCosts || {};

  return (
    getItemSubtotal(order.items || []) +
    Number(costs.shippingFee || 0) +
    Number(costs.insuranceFee || 0) +
    Number(costs.bankFee || 0) +
    Number(costs.otherFee || 0) -
    Number(costs.discount || 0)
  );
}

function getSalesTotal(order: SalesOrder) {
  return Number(
    order.subtotal ||
      (order.items || []).reduce(
        (sum, item) =>
          sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
        0
      )
  );
}

function getSalesPaid(order: SalesOrder) {
  if (typeof order.amountPaid === "number") return Number(order.amountPaid || 0);

  return (order.payments || []).reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0
  );
}

function getSalesCost(order: SalesOrder) {
  return (order.items || []).reduce(
    (sum, item) =>
      sum + Number(item.quantity || 0) * Number(item.unitCost || 0),
    0
  );
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

export default function DashboardPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [paymentsReceived, setPaymentsReceived] = useState<Payment[]>([]);
  const [paymentsMade, setPaymentsMade] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);

  useEffect(() => {
    loadDashboard();
    window.addEventListener("pageshow", loadDashboard);

    return () => {
      window.removeEventListener("pageshow", loadDashboard);
    };
  }, []);

  function loadDashboard() {
    setInventory(readLocalStorage<InventoryItem[]>("halfi_items", []));
    setPurchaseOrders(
      readLocalStorage<PurchaseOrder[]>("halfi_purchase_orders", [])
    );
    setSalesOrders(readLocalStorage<SalesOrder[]>("halfi_sales_orders", []));
    setPaymentsReceived(
      readLocalStorage<Payment[]>("halfi_payments_received", [])
    );
    setPaymentsMade(readLocalStorage<Payment[]>("halfi_payments_made", []));
    setExpenses(readLocalStorage<Expense[]>("halfi_expenses", []));
    setCustomers(readLocalStorage<any[]>("halfi_customers", []));
    setVendors(readLocalStorage<any[]>("halfi_vendors", []));
  }

  const inventoryQty = inventory.reduce((sum, item) => sum + getStockQty(item), 0);

  const inventoryValue = inventory.reduce(
    (sum, item) => sum + getStockQty(item) * Number(item.unitCost || 0),
    0
  );

  const lowStock = inventory.filter((item) => {
    const qty = getStockQty(item);
    return qty > 0 && qty <= 5;
  });

  const outOfStock = inventory.filter((item) => getStockQty(item) <= 0);

  const poTotal = purchaseOrders.reduce(
    (sum, order) => sum + getPOGrandTotal(order),
    0
  );

  const poPaid = purchaseOrders.reduce(
    (sum, order) => sum + Number(order.amountPaid || 0),
    0
  );

  const poOwed = Math.max(poTotal - poPaid, 0);

  const salesTotal = salesOrders
    .filter((order) => order.status !== "Cancelled")
    .reduce((sum, order) => sum + getSalesTotal(order), 0);

  const salesCost = salesOrders
    .filter((order) => order.status !== "Cancelled")
    .reduce((sum, order) => sum + getSalesCost(order), 0);

  const grossProfit = salesTotal - salesCost;

  const customerPaid = paymentsReceived.reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0
  );

  const customerOwes = salesOrders
    .filter((order) => order.status !== "Cancelled")
    .reduce(
      (sum, order) => sum + Math.max(getSalesTotal(order) - getSalesPaid(order), 0),
      0
    );

  const cashOut =
    paymentsMade.reduce((sum, payment) => sum + Number(payment.amount || 0), 0) +
    expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

  const netCash = customerPaid - cashOut;

  const activePOs = purchaseOrders.filter(
    (order) => !["Closed", "Cancelled", "Received"].includes(order.status)
  );

  const recentSales = [...salesOrders]
    .sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime())
    .slice(0, 5);

  const recentPOs = [...purchaseOrders]
    .sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime())
    .slice(0, 5);

  const bestProduct = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; sales: number }>();

    salesOrders
      .filter((order) => order.status !== "Cancelled")
      .forEach((order) => {
        (order.items || []).forEach((item) => {
          const name = item.productName || "Unknown";
          const current = map.get(name) || { name, qty: 0, sales: 0 };

          current.qty += Number(item.quantity || 0);
          current.sales +=
            Number(item.quantity || 0) * Number(item.unitPrice || 0);

          map.set(name, current);
        });
      });

    return [...map.values()].sort((a, b) => b.qty - a.qty)[0];
  }, [salesOrders]);

  return (
    <main className="min-h-screen bg-[#f4f4f5] p-6">
      <div className="mx-auto max-w-7xl">
        <section className="relative mb-6 overflow-hidden rounded-[2rem] bg-black p-8 text-white shadow-xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(250,204,21,0.24),transparent_32%),radial-gradient(circle_at_90%_20%,rgba(250,204,21,0.14),transparent_35%)]" />

          <div className="relative z-10 flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.35em] text-amber-300">
                Halfi Inventory System
              </p>

              <h1 className="mt-3 text-5xl font-black tracking-tight">
                Dashboard
              </h1>

              <p className="mt-3 max-w-2xl text-zinc-300">
                A clean view of inventory, purchasing, sales, customer money,
                vendor money, and profit.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <QuickButton href="/add-items" label="Add Item" icon={Plus} />
              <QuickButton href="/purchase-orders" label="New PO" icon={Truck} />
              <QuickButton href="/sales-orders" label="New Sale" icon={ShoppingCart} />
            </div>
          </div>
        </section>

        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <BigStat
            label="Inventory Value"
            value={money(inventoryValue)}
            sub={`${inventoryQty} units in stock`}
            icon={Boxes}
            tone="dark"
          />

          <BigStat
            label="Cash Collected"
            value={money(customerPaid)}
            sub={`${money(customerOwes)} still owed by customers`}
            icon={DollarSign}
            tone="green"
          />

          <BigStat
            label="Gross Profit"
            value={money(grossProfit)}
            sub={`${money(salesTotal)} sales revenue`}
            icon={BarChart3}
            tone={grossProfit >= 0 ? "green" : "red"}
          />

          <BigStat
            label="Net Cash"
            value={money(netCash)}
            sub={`${money(cashOut)} cash out`}
            icon={Wallet}
            tone={netCash >= 0 ? "green" : "red"}
          />
        </section>

        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <SmallStat label="Products" value={String(inventory.length)} />
          <SmallStat label="Low Stock" value={String(lowStock.length)} alert />
          <SmallStat label="Out of Stock" value={String(outOfStock.length)} danger />
          <SmallStat label="Open POs" value={String(activePOs.length)} />
          <SmallStat label="Customers" value={String(customers.length)} />
          <SmallStat label="Vendors" value={String(vendors.length)} />
        </section>

        <section className="mb-6 grid gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2 rounded-[2rem] bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black">Business Snapshot</h2>
                <p className="text-sm text-zinc-500">
                  What is happening right now.
                </p>
              </div>

              <Link
                href="/reports/financial"
                className="rounded-xl bg-black px-4 py-3 text-sm font-bold text-amber-300"
              >
                Full Report
              </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <SnapshotCard
                title="Purchasing"
                icon={Truck}
                lines={[
                  ["PO total", money(poTotal)],
                  ["Paid to vendors", money(poPaid)],
                  ["Still owe vendors", money(poOwed)],
                ]}
                href="/purchase-orders"
              />

              <SnapshotCard
                title="Sales"
                icon={ShoppingCart}
                lines={[
                  ["Sales total", money(salesTotal)],
                  ["Collected", money(customerPaid)],
                  ["Customers owe", money(customerOwes)],
                ]}
                href="/sales-orders"
              />

              <SnapshotCard
                title="Inventory"
                icon={Warehouse}
                lines={[
                  ["Units in stock", String(inventoryQty)],
                  ["Cost value", money(inventoryValue)],
                  ["Low/out alerts", String(lowStock.length + outOfStock.length)],
                ]}
                href="/inventory"
              />

              <SnapshotCard
                title="Best Seller"
                icon={PackageCheck}
                lines={[
                  ["Product", bestProduct?.name || "-"],
                  ["Qty sold", String(bestProduct?.qty || 0)],
                  ["Sales", money(bestProduct?.sales || 0)],
                ]}
                href="/reports/sales"
              />
            </div>
          </div>

          <div className="rounded-[2rem] bg-black p-6 text-white shadow-sm">
            <h2 className="text-2xl font-black text-amber-300">Attention</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Things you may want to check.
            </p>

            <div className="mt-5 space-y-3">
              <AttentionItem
                icon={AlertTriangle}
                title="Low stock"
                text={`${lowStock.length} item(s) are running low`}
                href="/reports/inventory"
                warning
              />

              <AttentionItem
                icon={AlertTriangle}
                title="Out of stock"
                text={`${outOfStock.length} item(s) are out`}
                href="/reports/inventory"
                danger
              />

              <AttentionItem
                icon={DollarSign}
                title="Customer balances"
                text={`${money(customerOwes)} still needs collection`}
                href="/payments-received"
              />

              <AttentionItem
                icon={Wallet}
                title="Vendor balances"
                text={`${money(poOwed)} still owed to vendors`}
                href="/payments-made"
              />
            </div>
          </div>
        </section>

        <section className="mb-6 grid gap-6 xl:grid-cols-2">
          <RecentCard
            title="Recent Sales"
            empty="No sales yet."
            href="/sales-orders"
            items={recentSales.map((order) => ({
              id: order.id,
              title: order.customerName || "Customer",
              subtitle: order.date,
              amount: money(getSalesTotal(order)),
              status:
                getSalesTotal(order) - getSalesPaid(order) <= 0
                  ? "Paid"
                  : "Balance Due",
            }))}
          />

          <RecentCard
            title="Recent Purchase Orders"
            empty="No purchase orders yet."
            href="/purchase-orders"
            items={recentPOs.map((order) => ({
              id: order.id,
              title: order.vendor || "Vendor",
              subtitle: order.date,
              amount: money(getPOGrandTotal(order)),
              status: order.status,
            }))}
          />
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ModuleCard
            title="Inventory"
            text="View stock, values, low stock, and out of stock products."
            href="/inventory"
            icon={Boxes}
          />

          <ModuleCard
            title="Purchasing"
            text="Create purchase orders, receive inventory, and pay bills."
            href="/purchase-orders"
            icon={Truck}
          />

          <ModuleCard
            title="Sales"
            text="Create invoices, track customers, and collect payments."
            href="/sales-orders"
            icon={ShoppingCart}
          />

          <ModuleCard
            title="Reports"
            text="See financial, sales, and inventory performance."
            href="/reports/financial"
            icon={FileText}
          />
        </section>
      </div>
    </main>
  );
}

function QuickButton({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: any;
}) {
  return (
    <Link
      href={href}
      className="flex min-w-28 items-center justify-center gap-2 rounded-2xl bg-amber-300 px-4 py-3 text-sm font-black text-black transition hover:scale-[1.02]"
    >
      <Icon size={17} />
      {label}
    </Link>
  );
}

function BigStat({
  label,
  value,
  sub,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  icon: any;
  tone: "dark" | "green" | "red";
}) {
  const color =
    tone === "green"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "red"
      ? "bg-red-50 text-red-700"
      : "bg-zinc-100 text-zinc-900";

  return (
    <div className="rounded-[2rem] bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <div className={`rounded-2xl p-3 ${color}`}>
          <Icon size={24} />
        </div>

        <CheckCircle2 size={20} className="text-zinc-300" />
      </div>

      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-2 text-4xl font-black tracking-tight">{value}</p>
      <p className="mt-2 text-sm text-zinc-500">{sub}</p>
    </div>
  );
}

function SmallStat({
  label,
  value,
  alert,
  danger,
}: {
  label: string;
  value: string;
  alert?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm">
      <p className="text-sm text-zinc-500">{label}</p>
      <p
        className={`mt-2 text-3xl font-black ${
          danger ? "text-red-700" : alert ? "text-amber-700" : "text-black"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function SnapshotCard({
  title,
  icon: Icon,
  lines,
  href,
}: {
  title: string;
  icon: any;
  lines: [string, string][];
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-3xl border bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
            <Icon size={22} />
          </div>

          <h3 className="text-xl font-black">{title}</h3>
        </div>

        <ArrowRight size={18} className="text-zinc-400" />
      </div>

      <div className="space-y-2">
        {lines.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between text-sm">
            <span className="text-zinc-500">{label}</span>
            <span className="font-black">{value}</span>
          </div>
        ))}
      </div>
    </Link>
  );
}

function AttentionItem({
  icon: Icon,
  title,
  text,
  href,
  warning,
  danger,
}: {
  icon: any;
  title: string;
  text: string;
  href: string;
  warning?: boolean;
  danger?: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-2xl bg-white/5 p-4 transition hover:bg-white/10"
    >
      <div
        className={`rounded-xl p-2 ${
          danger
            ? "bg-red-500/20 text-red-300"
            : warning
            ? "bg-amber-500/20 text-amber-300"
            : "bg-emerald-500/20 text-emerald-300"
        }`}
      >
        <Icon size={18} />
      </div>

      <div>
        <p className="font-black">{title}</p>
        <p className="text-sm text-zinc-400">{text}</p>
      </div>
    </Link>
  );
}

function RecentCard({
  title,
  empty,
  href,
  items,
}: {
  title: string;
  empty: string;
  href: string;
  items: {
    id: string;
    title: string;
    subtitle: string;
    amount: string;
    status: string;
  }[];
}) {
  return (
    <div className="rounded-[2rem] bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-2xl font-black">{title}</h2>

        <Link href={href} className="text-sm font-bold text-amber-700">
          View all
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="rounded-2xl bg-zinc-100 p-5 text-zinc-500">{empty}</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Link
              key={item.id}
              href={href}
              className="flex items-center justify-between rounded-2xl border p-4 transition hover:bg-zinc-50"
            >
              <div>
                <p className="font-black">{item.id}</p>
                <p className="text-sm text-zinc-500">
                  {item.title} · {item.subtitle}
                </p>
              </div>

              <div className="text-right">
                <p className="font-black">{item.amount}</p>
                <p className="text-xs font-bold text-zinc-500">{item.status}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function ModuleCard({
  title,
  text,
  href,
  icon: Icon,
}: {
  title: string;
  text: string;
  href: string;
  icon: any;
}) {
  return (
    <Link
      href={href}
      className="group rounded-[2rem] bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="mb-5 flex items-center justify-between">
        <div className="rounded-2xl bg-black p-3 text-amber-300">
          <Icon size={24} />
        </div>

        <div className="rounded-full bg-zinc-100 p-2 transition group-hover:bg-amber-300">
          <ArrowRight size={18} />
        </div>
      </div>

      <h3 className="text-2xl font-black">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-zinc-500">{text}</p>
    </Link>
  );
}
