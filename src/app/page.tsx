"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Boxes,
  Settings,
  ShoppingCart,
  Truck,
  Users,
  Wallet,
} from "lucide-react";

type InventoryItem = {
  quantity?: number;
  pendingQty?: number;
  inStockQty?: number;
  unitCost?: number;
};

type POItem = {
  quantity?: number;
  unitCost?: number;
};

type PurchaseOrder = {
  status?:
    | "Draft"
    | "Issued"
    | "Partially Paid"
    | "Paid"
    | "Received"
    | "Closed"
    | "Cancelled";
  items?: POItem[];
};

function getQty(item: InventoryItem) {
  return Number(item.quantity ?? item.pendingQty ?? item.inStockQty ?? 0);
}


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

export default function Home() {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [openSection, setOpenSection] = useState<string | null>(null);

  useEffect(() => {
    function loadDashboardData() {
      const savedInventory = localStorage.getItem("halfi_items");
      const savedPOs = localStorage.getItem("halfi_purchase_orders");

      try {
        setInventoryItems(savedInventory ? JSON.parse(savedInventory) : []);
      } catch {
        setInventoryItems([]);
      }

      try {
        setPurchaseOrders(savedPOs ? JSON.parse(savedPOs) : []);
      } catch {
        setPurchaseOrders([]);
      }
    }

    loadDashboardData();

    window.addEventListener("pageshow", loadDashboardData);
    window.addEventListener("focus", loadDashboardData);

    return () => {
      window.removeEventListener("pageshow", loadDashboardData);
      window.removeEventListener("focus", loadDashboardData);
    };
  }, []);

  const inventoryQty = useMemo(
    () => inventoryItems.reduce((sum, item) => sum + getQty(item), 0),
    [inventoryItems]
  );

  const inventoryValue = useMemo(
    () =>
      inventoryItems.reduce(
        (sum, item) => sum + getQty(item) * Number(item.unitCost ?? 0),
        0
      ),
    [inventoryItems]
  );

  const draftPOs = purchaseOrders.filter((po) => po.status === "Draft").length;

  const issuedPOs = purchaseOrders.filter((po) => po.status === "Issued").length;

  const partiallyPaidPOs = purchaseOrders.filter(
    (po) => po.status === "Partially Paid"
  ).length;

  const paidPOs = purchaseOrders.filter((po) => po.status === "Paid").length;

  const receivedPOs = purchaseOrders.filter(
    (po) => po.status === "Received"
  ).length;

  const closedPOs = purchaseOrders.filter((po) => po.status === "Closed").length;

  const purchaseTotal = purchaseOrders.reduce((sum, po) => {
    const items = po.items || [];

    const orderTotal = items.reduce(
      (itemSum, item) =>
        itemSum + Number(item.quantity || 0) * Number(item.unitCost || 0),
      0
    );

    return sum + orderTotal;
  }, 0);

  const stats = [
    { label: "Inventory Qty", value: inventoryQty },
    {
      label: "Inventory Value",
      value: `$${inventoryValue.toLocaleString()}`,
    },
    { label: "Draft POs", value: draftPOs },
    { label: "Issued POs", value: issuedPOs },
    { label: "Partial Paid POs", value: partiallyPaidPOs },
    { label: "Paid POs", value: paidPOs },
    { label: "Received POs", value: receivedPOs },
    { label: "Closed POs", value: closedPOs },
    {
      label: "Purchase Total",
      value: `$${purchaseTotal.toLocaleString()}`,
    },
  ];

  return (
    <section>
      <div className="mb-8 rounded-3xl bg-black p-8 text-white shadow-lg">
        <h2 className="text-3xl font-black text-amber-300">Dashboard</h2>
        <p className="mt-2 text-zinc-300">
          Manage inventory, sales, purchasing, contacts, finance, reports, and
          settings.
        </p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200"
          >
            <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">
              {stat.label}
            </p>

            <p className="mt-2 text-2xl font-black text-black">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {sections.map((section) => {
          const Icon = section.icon;
          const isOpen = openSection === section.title;

          return (
            <div
              key={section.title}
              className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-200"
            >
              <button
                type="button"
                onClick={() => setOpenSection(isOpen ? null : section.title)}
                className="flex w-full items-center justify-between text-left"
              >
                <div>
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                    <Icon size={24} />
                  </div>

                  <h3 className="text-xl font-bold uppercase">
                    {section.title}
                  </h3>
                </div>

                <span className="text-3xl font-black text-zinc-400">
                  {isOpen ? "−" : "+"}
                </span>
              </button>

              {isOpen && (
                <div className="mt-5 space-y-2 border-t pt-4">
                  {section.links.map(([label, href]) => (
                    <Link
                      key={label}
                      href={href}
                      className="flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium transition hover:border-black hover:bg-zinc-50"
                    >
                      {label}
                      <span>›</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}