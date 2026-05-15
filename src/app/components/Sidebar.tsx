"use client";

import Link from "next/link";
import { useState } from "react";
import {
  BarChart3,
  Boxes,
  Settings,
  ShoppingCart,
  Truck,
  Users,
  Wallet,
  Warehouse,
  ChevronDown,
} from "lucide-react";

const sections = [
  {
    title: "Inventory",
    icon: Boxes,
    links: [
      ["Inventory List", "/inventory"],
      ["Adjust Inventory", "/inventory/adjust"],
      ["Transfers", "/inventory/transfers"],
    ],
  },
  {
    title: "Sales",
    icon: ShoppingCart,
    links: [
      ["Sales Orders", "/sales-orders"],
      ["Invoices", "/invoices"],
      ["Payments Received", "/payments-received"],
      ["Returns", "/returns"],
    ],
  },
  {
    title: "Purchasing",
    icon: Truck,
    links: [
      ["Add Item", "/add-items"],
      ["Purchase Orders", "/purchase-orders"],
      ["Receive Inventory", "/receive-inventory"],
      ["Bills", "/bills"],
      ["Payments Made", "/payments-made"],
    ],
  },
  {
    title: "Contacts",
    icon: Users,
    links: [
      ["Customers", "/customers"],
      ["Vendors", "/vendors"],
    ],
  },
  {
    title: "Finance",
    icon: Wallet,
    links: [
      ["Expenses", "/expenses"],
      ["Transactions", "/transactions"],
    ],
  },
  {
    title: "Reports",
    icon: BarChart3,
    links: [
      ["Inventory Reports", "/reports/inventory"],
      ["Sales Reports", "/reports/sales"],
      ["Financial Reports", "/reports/financial"],
    ],
  },
  {
    title: "Settings",
    icon: Settings,
    links: [
      ["Users", "/settings/users"],
      ["Warehouses", "/settings/warehouses"],
      ["Company Settings", "/settings/company"],
    ],
  },
];

function resetSystem() {
  const confirmed = window.confirm(
    "Are you sure? This will delete ALL inventory, purchase orders, bills, customers, vendors, payments, and sales orders."
  );

  if (!confirmed) return;

  localStorage.removeItem("halfi_items");
  localStorage.removeItem("halfi_purchase_orders");
  localStorage.removeItem("halfi_receive_inventory");
  localStorage.removeItem("halfi_bills");
  localStorage.removeItem("halfi_payments_made");
  localStorage.removeItem("halfi_sales_orders");
  localStorage.removeItem("halfi_customers");
  localStorage.removeItem("halfi_vendors");
  localStorage.removeItem("halfi_invoices");
  localStorage.removeItem("halfi_payments_received");

  alert("System reset completed.");
  window.location.reload();
}

export default function Sidebar() {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    {}
  );

  const toggleSection = (title: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  return (
    <aside className="fixed left-0 top-0 hidden h-screen w-80 overflow-y-auto bg-black p-6 text-white lg:block">
      <div className="mb-8">
        <h1 className="text-4xl font-black tracking-[0.25em] text-amber-300">
          HALFI
        </h1>
        <p className="mt-2 text-xs uppercase tracking-[0.3em] text-zinc-400">
          Inventory System
        </p>
      </div>

      <Link
        href="/"
        className="mb-6 flex items-center gap-3 rounded-2xl bg-amber-300 px-4 py-3 font-bold text-black"
      >
        <Warehouse size={20} />
        Dashboard
      </Link>

      <nav className="space-y-4">
        {sections.map((section) => {
          const Icon = section.icon;
          const isOpen = openSections[section.title];

          return (
            <div key={section.title} className="select-none">
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.title)}
                className="flex w-full items-center justify-between rounded-xl px-2 py-2 text-xs font-bold uppercase tracking-[0.2em] text-amber-300 hover:bg-zinc-900"
              >
                <div className="flex items-center gap-2">
                  <Icon size={15} />
                  {section.title}
                </div>

                <ChevronDown
                  size={16}
                  className={`transition-transform duration-200 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Links */}
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  isOpen ? "max-h-96 mt-2" : "max-h-0"
                }`}
              >
                <div className="space-y-1 pl-6">
                  {section.links.map(([label, href]) => (
                    <Link
                      key={label}
                      href={href}
                      className="block rounded-xl px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-900 hover:text-white"
                    >
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </nav>

    <button
  type="button"
  onClick={resetSystem}
  className="w-full rounded-xl bg-red-600 px-5 py-3 font-bold text-white"
>
  Reset System
</button>

<button
  type="button"
  onClick={() => {
    localStorage.removeItem("halfi_logged_in");
    window.location.href = "/login";
  }}
  className="mt-3 w-full rounded-xl bg-zinc-800 px-5 py-3 font-bold text-white hover:bg-zinc-700"
>
  Logout
</button>
    
    </aside>
  );
}