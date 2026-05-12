import Link from "next/link";
import {
  BarChart3,
  Boxes,
  Settings,
  ShoppingCart,
  Truck,
  Users,
  Wallet,
  Warehouse,
} from "lucide-react";

const sections = [
  {
    title: "Inventory",
    icon: Boxes,
    links: [
      ["Inventory List", "/inventory"],
      ["Add Item", "/inventory/add"],
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

export default function Sidebar() {
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

      <nav className="space-y-6">
        {sections.map((section) => {
          const Icon = section.icon;

          return (
            <div key={section.title}>
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-amber-300">
                <Icon size={15} />
                {section.title}
              </div>

              <div className="space-y-1">
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
          );
        })}
      </nav>
    </aside>
  );
}