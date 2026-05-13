"use client";

import { useEffect, useMemo, useState } from "react";

type InventoryItem = {
  id: string;
  productName: string;
  modelNo?: string;
  sku?: string;
  size?: string;
  quantity?: number;
  pendingQty?: number;
  inStockQty?: number;
  unitCost?: number;
  sellingPrice?: number;
  status?: string;
};

type Customer = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
};

type SalesOrderItem = {
  id: string;
  inventoryId: string;
  productName: string;
  modelNo?: string;
  sku?: string;
  size?: string;
  quantity: number;
  availableBeforeSale: number;
  unitPrice: number;
  unitCost: number;
};

type SalesOrder = {
  id: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  date: string;
  status: "Draft" | "Completed" | "Cancelled";
  items: SalesOrderItem[];
  subtotal: number;
};

function getStockQty(item: InventoryItem) {
  return Number(item.quantity ?? item.inStockQty ?? 0);
}

function getInventoryStatus(qty: number) {
  if (qty <= 0) return "Out of Stock";
  if (qty <= 5) return "Low Stock";
  return "In Stock";
}

export default function SalesOrdersPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<SalesOrder[]>([]);

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const [selectedInventoryId, setSelectedInventoryId] = useState("");
  const [qty, setQty] = useState(1);
  const [unitPrice, setUnitPrice] = useState("");
  const [cart, setCart] = useState<SalesOrderItem[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);

  useEffect(() => {
    loadData();
    window.addEventListener("pageshow", loadData);

    return () => {
      window.removeEventListener("pageshow", loadData);
    };
  }, []);

  function loadData() {
    try {
      const savedInventory = localStorage.getItem("halfi_items");
      setInventory(savedInventory ? JSON.parse(savedInventory) : []);
    } catch {
      setInventory([]);
    }

    try {
      const savedCustomers = localStorage.getItem("halfi_customers");
      setCustomers(savedCustomers ? JSON.parse(savedCustomers) : []);
    } catch {
      setCustomers([]);
    }

    try {
      const savedOrders = localStorage.getItem("halfi_sales_orders");
      setOrders(savedOrders ? JSON.parse(savedOrders) : []);
    } catch {
      setOrders([]);
    }
  }

  function saveOrders(updated: SalesOrder[]) {
    setOrders(updated);
    localStorage.setItem("halfi_sales_orders", JSON.stringify(updated));
  }

  function saveInventory(updated: InventoryItem[]) {
    setInventory(updated);
    localStorage.setItem("halfi_items", JSON.stringify(updated));
  }

  const availableInventory = useMemo(() => {
    return inventory.filter((item) => getStockQty(item) > 0);
  }, [inventory]);

  const selectedInventoryItem = inventory.find(
    (item) => item.id === selectedInventoryId
  );

  const cartSubtotal = cart.reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
    0
  );

  function selectCustomer(name: string) {
    setCustomerName(name);

    const found = customers.find((customer) => customer.name === name);

    if (found) {
      setCustomerEmail(found.email || "");
      setCustomerPhone(found.phone || "");
    }
  }

  function addItemToCart() {
    if (!selectedInventoryItem) {
      alert("Choose an inventory item first.");
      return;
    }

    const available = getStockQty(selectedInventoryItem);
    const requestedQty = Number(qty || 0);

    if (requestedQty <= 0) {
      alert("Enter a valid quantity.");
      return;
    }

    if (requestedQty > available) {
      alert(`Only ${available} available in stock.`);
      return;
    }

    const price = Number(unitPrice || selectedInventoryItem.sellingPrice || selectedInventoryItem.unitCost || 0);

    if (price <= 0) {
      alert("Enter a valid selling price.");
      return;
    }

    const existingCartQty = cart
      .filter((item) => item.inventoryId === selectedInventoryItem.id)
      .reduce((sum, item) => sum + Number(item.quantity || 0), 0);

    if (existingCartQty + requestedQty > available) {
      alert(`You already added ${existingCartQty}. Only ${available} available total.`);
      return;
    }

    const newItem: SalesOrderItem = {
      id: `SOITEM-${Date.now()}-${Math.random()}`,
      inventoryId: selectedInventoryItem.id,
      productName: selectedInventoryItem.productName,
      modelNo: selectedInventoryItem.modelNo || "",
      sku: selectedInventoryItem.sku || "",
      size: selectedInventoryItem.size || "",
      quantity: requestedQty,
      availableBeforeSale: available,
      unitPrice: price,
      unitCost: Number(selectedInventoryItem.unitCost || 0),
    };

    setCart([...cart, newItem]);
    setSelectedInventoryId("");
    setQty(1);
    setUnitPrice("");
  }

  function removeCartItem(id: string) {
    setCart(cart.filter((item) => item.id !== id));
  }

  function completeSalesOrder() {
    if (!customerName.trim()) {
      alert("Enter or select a customer.");
      return;
    }

    if (cart.length === 0) {
      alert("Add at least one item.");
      return;
    }

    const updatedInventory = [...inventory];

    for (const cartItem of cart) {
      const index = updatedInventory.findIndex(
        (item) => item.id === cartItem.inventoryId
      );

      if (index < 0) {
        alert(`Inventory item missing: ${cartItem.productName}`);
        return;
      }

      const currentQty = getStockQty(updatedInventory[index]);

      if (cartItem.quantity > currentQty) {
        alert(
          `${cartItem.productName} only has ${currentQty} left. Adjust quantity.`
        );
        return;
      }

      const finalQty = currentQty - cartItem.quantity;

      updatedInventory[index] = {
        ...updatedInventory[index],
        quantity: finalQty,
        inStockQty: finalQty,
        pendingQty: finalQty,
        status: getInventoryStatus(finalQty),
      };
    }

    const newOrder: SalesOrder = {
      id: `SO-${Date.now()}`,
      customerName,
      customerEmail,
      customerPhone,
      date: new Date().toLocaleDateString(),
      status: "Completed",
      items: cart,
      subtotal: cartSubtotal,
    };

    saveInventory(updatedInventory);
    saveOrders([newOrder, ...orders]);

    setCustomerName("");
    setCustomerEmail("");
    setCustomerPhone("");
    setCart([]);
    setSelectedInventoryId("");
    setQty(1);
    setUnitPrice("");

    alert("Sales order completed and inventory updated.");
  }

  function deleteSalesOrder(order: SalesOrder) {
    const confirmDelete = window.confirm(
      "Delete this sales order? This will add the sold quantities back into inventory."
    );

    if (!confirmDelete) return;

    const updatedInventory = [...inventory];

    order.items.forEach((soldItem) => {
      const index = updatedInventory.findIndex(
        (item) => item.id === soldItem.inventoryId
      );

      if (index >= 0) {
        const currentQty = getStockQty(updatedInventory[index]);
        const finalQty = currentQty + Number(soldItem.quantity || 0);

        updatedInventory[index] = {
          ...updatedInventory[index],
          quantity: finalQty,
          inStockQty: finalQty,
          pendingQty: finalQty,
          status: getInventoryStatus(finalQty),
        };
      }
    });

    saveInventory(updatedInventory);
    saveOrders(orders.filter((savedOrder) => savedOrder.id !== order.id));
    setSelectedOrder(null);

    alert("Sales order deleted and inventory restored.");
  }

  const totalSales = orders.reduce(
    (sum, order) => sum + Number(order.subtotal || 0),
    0
  );

  const totalItemsSold = orders.reduce(
    (sum, order) =>
      sum +
      order.items.reduce(
        (itemSum, item) => itemSum + Number(item.quantity || 0),
        0
      ),
    0
  );

  return (
    <main className="min-h-screen bg-zinc-100 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-3xl bg-black p-8 text-white">
          <h1 className="text-4xl font-black tracking-widest text-amber-300">
            SALES ORDERS
          </h1>
          <p className="mt-2 text-zinc-300">
            Sell available inventory and automatically reduce stock.
          </p>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm text-zinc-500">Sales Orders</p>
            <p className="mt-2 text-3xl font-black">{orders.length}</p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm text-zinc-500">Items Sold</p>
            <p className="mt-2 text-3xl font-black">{totalItemsSold}</p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm text-zinc-500">Sales Total</p>
            <p className="mt-2 text-3xl font-black">
              ${totalSales.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-2xl font-bold">Create Sales Order</h2>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-bold">Customer</label>
              <select
                value={customerName}
                onChange={(e) => selectCustomer(e.target.value)}
                className="mt-2 w-full rounded-xl border px-4 py-3"
              >
                <option value="">Select customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.name}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-bold">Customer Email</label>
              <input
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="customer@email.com"
                className="mt-2 w-full rounded-xl border px-4 py-3"
              />
            </div>

            <div>
              <label className="text-sm font-bold">Customer Phone</label>
              <input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Phone number"
                className="mt-2 w-full rounded-xl border px-4 py-3"
              />
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-zinc-100 p-5">
            <h3 className="mb-4 text-xl font-bold">Add Inventory Item</h3>

            <div className="grid gap-4 md:grid-cols-5">
              <div className="md:col-span-2">
                <label className="text-sm font-bold">Inventory Item</label>
                <select
                  value={selectedInventoryId}
                  onChange={(e) => {
                    const id = e.target.value;
                    const found = inventory.find((item) => item.id === id);

                    setSelectedInventoryId(id);
                    setUnitPrice(
                      found
                        ? String(found.sellingPrice || found.unitCost || "")
                        : ""
                    );
                  }}
                  className="mt-2 w-full rounded-xl border bg-white px-4 py-3"
                >
                  <option value="">Select item</option>
                  {availableInventory.map((item) => {
                    const stock = getStockQty(item);

                    return (
                      <option key={item.id} value={item.id}>
                        {item.productName} | Model: {item.modelNo || "-"} | Size:{" "}
                        {item.size || "-"} | Stock: {stock}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="text-sm font-bold">Qty</label>
                <input
                  type="number"
                  min="1"
                  max={selectedInventoryItem ? getStockQty(selectedInventoryItem) : undefined}
                  value={qty}
                  onChange={(e) => setQty(Number(e.target.value))}
                  className="mt-2 w-full rounded-xl border bg-white px-4 py-3"
                />
              </div>

              <div>
                <label className="text-sm font-bold">Unit Price</label>
                <input
                  type="number"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  className="mt-2 w-full rounded-xl border bg-white px-4 py-3"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={addItemToCart}
                  className="w-full rounded-xl bg-black px-5 py-3 font-bold text-amber-300"
                >
                  Add
                </button>
              </div>
            </div>

            {selectedInventoryItem && (
              <div className="mt-4 rounded-xl bg-white p-4">
                <p className="font-bold">
                  Available Stock: {getStockQty(selectedInventoryItem)}
                </p>
                <p className="text-sm text-zinc-500">
                  {selectedInventoryItem.productName} · Model:{" "}
                  {selectedInventoryItem.modelNo || "-"} · Size:{" "}
                  {selectedInventoryItem.size || "-"}
                </p>
              </div>
            )}
          </div>

          {cart.length > 0 && (
            <div className="mt-6 overflow-x-auto rounded-2xl border">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-zinc-100 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="p-4">Product</th>
                    <th className="p-4">Model</th>
                    <th className="p-4">Size</th>
                    <th className="p-4">Qty</th>
                    <th className="p-4">Available Before Sale</th>
                    <th className="p-4">Unit Price</th>
                    <th className="p-4">Total</th>
                    <th className="p-4">Remove</th>
                  </tr>
                </thead>

                <tbody>
                  {cart.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="p-4 font-bold">{item.productName}</td>
                      <td className="p-4">{item.modelNo || "-"}</td>
                      <td className="p-4">{item.size || "-"}</td>
                      <td className="p-4 font-black">{item.quantity}</td>
                      <td className="p-4">{item.availableBeforeSale}</td>
                      <td className="p-4">
                        ${Number(item.unitPrice || 0).toLocaleString()}
                      </td>
                      <td className="p-4 font-bold">
                        $
                        {(
                          Number(item.quantity || 0) *
                          Number(item.unitPrice || 0)
                        ).toLocaleString()}
                      </td>
                      <td className="p-4">
                        <button
                          type="button"
                          onClick={() => removeCartItem(item.id)}
                          className="rounded-xl bg-red-600 px-4 py-2 font-bold text-white"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-zinc-100 p-5">
            <div>
              <p className="text-sm text-zinc-500">Order Total</p>
              <p className="text-3xl font-black">${cartSubtotal.toLocaleString()}</p>
            </div>

            <button
              type="button"
              onClick={completeSalesOrder}
              className="rounded-xl bg-black px-5 py-3 font-bold text-amber-300"
            >
              Complete Sale & Update Inventory
            </button>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-2xl font-bold">Saved Sales Orders</h2>

          {orders.length === 0 ? (
            <p className="text-zinc-500">No sales orders yet.</p>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className="cursor-pointer rounded-2xl border p-5 transition hover:bg-zinc-50"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-black">{order.id}</h3>
                      <p className="text-sm text-zinc-500">
                        {order.customerName} · {order.date}
                      </p>
                      <p className="mt-1 font-bold">
                        Items:{" "}
                        {order.items.reduce(
                          (sum, item) => sum + Number(item.quantity || 0),
                          0
                        )}{" "}
                        · Total: ${Number(order.subtotal || 0).toLocaleString()}
                      </p>
                    </div>

                    <span className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-800">
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
            <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <h2 className="text-3xl font-black">{selectedOrder.id}</h2>
                  <p className="mt-1 text-zinc-500">
                    {selectedOrder.customerName} · {selectedOrder.date}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="rounded-xl bg-zinc-100 px-4 py-2 font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="mb-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl bg-zinc-100 p-4">
                  <p className="text-xs uppercase text-zinc-500">Customer</p>
                  <p className="mt-1 text-lg font-black">
                    {selectedOrder.customerName}
                  </p>
                </div>

                <div className="rounded-2xl bg-zinc-100 p-4">
                  <p className="text-xs uppercase text-zinc-500">Status</p>
                  <p className="mt-1 text-lg font-black">
                    {selectedOrder.status}
                  </p>
                </div>

                <div className="rounded-2xl bg-zinc-100 p-4">
                  <p className="text-xs uppercase text-zinc-500">Order Total</p>
                  <p className="mt-1 text-lg font-black">
                    ${Number(selectedOrder.subtotal || 0).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="mb-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => deleteSalesOrder(selectedOrder)}
                  className="rounded-xl bg-red-600 px-5 py-3 font-bold text-white"
                >
                  Delete Sale & Restore Inventory
                </button>
              </div>

              <div className="overflow-x-auto rounded-2xl border">
                <table className="w-full min-w-[800px] text-left text-sm">
                  <thead className="bg-zinc-100 text-xs uppercase text-zinc-500">
                    <tr>
                      <th className="p-4">Product</th>
                      <th className="p-4">Model</th>
                      <th className="p-4">Size</th>
                      <th className="p-4">Qty Sold</th>
                      <th className="p-4">Unit Price</th>
                      <th className="p-4">Total</th>
                    </tr>
                  </thead>

                  <tbody>
                    {selectedOrder.items.map((item) => (
                      <tr key={item.id} className="border-t">
                        <td className="p-4 font-bold">{item.productName}</td>
                        <td className="p-4">{item.modelNo || "-"}</td>
                        <td className="p-4">{item.size || "-"}</td>
                        <td className="p-4 font-black">{item.quantity}</td>
                        <td className="p-4">
                          ${Number(item.unitPrice || 0).toLocaleString()}
                        </td>
                        <td className="p-4 font-bold">
                          $
                          {(
                            Number(item.quantity || 0) *
                            Number(item.unitPrice || 0)
                          ).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
