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
  whatsapp?: string;
  address?: string;
  notes?: string;
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

type PaymentMethod = "Cash" | "Credit Card" | "Bank Transfer" | "Check" | "Other";

type PaymentReceived = {
  id: string;
  salesOrderId: string;
  customerName: string;
  date: string;
  amount: number;
  method: PaymentMethod;
  note?: string;
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

function escapeHtml(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getStockQty(item: InventoryItem) {
  return Number(item.quantity ?? item.inStockQty ?? 0);
}

function getInventoryStatus(qty: number) {
  if (qty <= 0) return "Out of Stock";
  if (qty <= 5) return "Low Stock";
  return "In Stock";
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

export default function SalesOrdersPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [paymentsReceived, setPaymentsReceived] = useState<PaymentReceived[]>([]);

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerWhatsApp, setCustomerWhatsApp] = useState("");

  const [selectedInventoryId, setSelectedInventoryId] = useState("");
  const [qty, setQty] = useState(1);
  const [unitPrice, setUnitPrice] = useState("");
  const [cart, setCart] = useState<SalesOrderItem[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);

  const [salePaymentAmount, setSalePaymentAmount] = useState("");
  const [salePaymentMethod, setSalePaymentMethod] =
    useState<PaymentMethod>("Cash");
  const [salePaymentNote, setSalePaymentNote] = useState("");

  const [extraPaymentAmount, setExtraPaymentAmount] = useState("");
  const [extraPaymentMethod, setExtraPaymentMethod] =
    useState<PaymentMethod>("Cash");
  const [extraPaymentNote, setExtraPaymentNote] = useState("");

  const [showCustomerPopup, setShowCustomerPopup] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerWhatsapp, setNewCustomerWhatsapp] = useState("");
  const [newCustomerAddress, setNewCustomerAddress] = useState("");

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

    try {
      const savedPayments = localStorage.getItem("halfi_payments_received");
      setPaymentsReceived(savedPayments ? JSON.parse(savedPayments) : []);
    } catch {
      setPaymentsReceived([]);
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

  function savePaymentsReceived(updated: PaymentReceived[]) {
    setPaymentsReceived(updated);
    localStorage.setItem("halfi_payments_received", JSON.stringify(updated));
  }

  const availableInventory = useMemo(() => {
    return inventory.filter((item) => getStockQty(item) > 0);
  }, [inventory]);

  const selectedInventoryItem = inventory.find(
    (item) => item.id === selectedInventoryId
  );

  const selectedStock = selectedInventoryItem ? getStockQty(selectedInventoryItem) : 0;
  const qtyTooHigh = Boolean(selectedInventoryItem) && Number(qty || 0) > selectedStock;
  const qtyInvalid = Number(qty || 0) <= 0;
  const canAddItem = Boolean(selectedInventoryItem) && !qtyTooHigh && !qtyInvalid;

  const cartSubtotal = cart.reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
    0
  );

  const totalSales = orders
    .filter((order) => order.status !== "Cancelled")
    .reduce((sum, order) => sum + getOrderTotal(order), 0);

  const totalReceived = orders
    .filter((order) => order.status !== "Cancelled")
    .reduce((sum, order) => sum + getOrderPaid(order), 0);

  const totalOwed = orders
    .filter((order) => order.status !== "Cancelled")
    .reduce((sum, order) => sum + getOrderBalance(order), 0);

  const totalItemsSold = orders
    .filter((order) => order.status !== "Cancelled")
    .reduce(
      (sum, order) =>
        sum +
        order.items.reduce(
          (itemSum, item) => itemSum + Number(item.quantity || 0),
          0
        ),
      0
    );

  function selectCustomer(name: string) {
    setCustomerName(name);

    const found = customers.find((customer) => customer.name === name);

    if (found) {
      setCustomerEmail(found.email || "");
      setCustomerPhone(found.phone || "");
      setCustomerWhatsApp(found.whatsapp || "");
    } else {
      setCustomerEmail("");
      setCustomerPhone("");
      setCustomerWhatsApp("");
    }
  }

  function createCustomerFromPopup() {
    if (!newCustomerName.trim()) {
      alert("Customer name is required.");
      return;
    }

    const newCustomer: Customer = {
      id: `CUS-${Date.now()}`,
      name: newCustomerName,
      email: newCustomerEmail,
      phone: newCustomerPhone,
      whatsapp: newCustomerWhatsapp,
      address: newCustomerAddress,
      notes: "",
    };

    const updatedCustomers = [newCustomer, ...customers];

    setCustomers(updatedCustomers);
    localStorage.setItem("halfi_customers", JSON.stringify(updatedCustomers));

    setCustomerName(newCustomer.name);
    setCustomerEmail(newCustomer.email || "");
    setCustomerPhone(newCustomer.phone || "");
    setCustomerWhatsApp(newCustomer.whatsapp || "");

    setNewCustomerName("");
    setNewCustomerEmail("");
    setNewCustomerPhone("");
    setNewCustomerWhatsapp("");
    setNewCustomerAddress("");

    setShowCustomerPopup(false);
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

    const price = Number(
      unitPrice ||
        selectedInventoryItem.sellingPrice ||
        selectedInventoryItem.unitCost ||
        0
    );

    if (price <= 0) {
      alert("Enter a valid selling price.");
      return;
    }

    const existingCartQty = cart
      .filter((item) => item.inventoryId === selectedInventoryItem.id)
      .reduce((sum, item) => sum + Number(item.quantity || 0), 0);

    if (existingCartQty + requestedQty > available) {
      alert(
        `You already added ${existingCartQty}. Only ${available} available total.`
      );
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

    const paymentAmount = Number(salePaymentAmount || 0);

    if (paymentAmount < 0) {
      alert("Payment cannot be negative.");
      return;
    }

    if (paymentAmount > cartSubtotal) {
      alert(`Payment cannot be more than the order total: ${money(cartSubtotal)}.`);
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

    const orderId = `SO-${Date.now()}`;

    const firstPayment: PaymentReceived | null =
      paymentAmount > 0
        ? {
            id: `PAYREC-${Date.now()}`,
            salesOrderId: orderId,
            customerName,
            date: new Date().toLocaleDateString(),
            amount: paymentAmount,
            method: salePaymentMethod,
            note: salePaymentNote || "Payment at sale",
          }
        : null;

    const newOrder: SalesOrder = {
      id: orderId,
      customerName,
      customerEmail,
      customerPhone,
      customerWhatsApp,
      date: new Date().toLocaleDateString(),
      status: "Completed",
      items: cart,
      subtotal: cartSubtotal,
      amountPaid: paymentAmount,
      payments: firstPayment ? [firstPayment] : [],
    };

    const updatedOrders = [newOrder, ...orders];
    const updatedPayments = firstPayment
      ? [firstPayment, ...paymentsReceived]
      : paymentsReceived;

    saveInventory(updatedInventory);
    saveOrders(updatedOrders);
    savePaymentsReceived(updatedPayments);

    setCustomerName("");
    setCustomerEmail("");
    setCustomerPhone("");
    setCustomerWhatsApp("");
    setCart([]);
    setSelectedInventoryId("");
    setQty(1);
    setUnitPrice("");
    setSalePaymentAmount("");
    setSalePaymentMethod("Cash");
    setSalePaymentNote("");

    alert("Sale completed. Inventory and customer balance updated.");
  }

  function recordExtraPayment(order: SalesOrder) {
    const amount = Number(extraPaymentAmount || 0);
    const balance = getOrderBalance(order);

    if (amount <= 0) {
      alert("Enter a valid payment amount.");
      return;
    }

    if (amount > balance) {
      alert(`Payment cannot be more than the balance: ${money(balance)}.`);
      return;
    }

    const payment: PaymentReceived = {
      id: `PAYREC-${Date.now()}`,
      salesOrderId: order.id,
      customerName: order.customerName,
      date: new Date().toLocaleDateString(),
      amount,
      method: extraPaymentMethod,
      note: extraPaymentNote,
    };

    const updatedOrders = orders.map((savedOrder) => {
      if (savedOrder.id !== order.id) return savedOrder;

      return {
        ...savedOrder,
        amountPaid: getOrderPaid(savedOrder) + amount,
        payments: [payment, ...(savedOrder.payments || [])],
      };
    });

    const updatedSelected = updatedOrders.find((savedOrder) => savedOrder.id === order.id) || null;

    saveOrders(updatedOrders);
    savePaymentsReceived([payment, ...paymentsReceived]);
    setSelectedOrder(updatedSelected);
    setExtraPaymentAmount("");
    setExtraPaymentMethod("Cash");
    setExtraPaymentNote("");

    alert("Payment received saved.");
  }

  function deleteSalesOrder(order: SalesOrder) {
    const confirmDelete = window.confirm(
      "Delete this sale? This will add the sold quantities back into inventory and delete its received payments."
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
    savePaymentsReceived(
      paymentsReceived.filter((payment) => payment.salesOrderId !== order.id)
    );

    setSelectedOrder(null);

    alert("Sale deleted, inventory restored, and related payments removed.");
  }

  function buildInvoiceMessage(order: SalesOrder) {
    const lines = order.items
      .map(
        (item) =>
          `${item.productName} | Model: ${item.modelNo || "-"} | SKU: ${
            item.sku || "-"
          } | Size: ${item.size || "-"} | Qty: ${
            item.quantity
          } | Unit Price: ${money(item.unitPrice)} | Total: ${money(
            item.quantity * item.unitPrice
          )}`
      )
      .join("\n");

    return `Invoice ${order.id}

Customer: ${order.customerName}
Date: ${order.date}

Items:
${lines}

Total: ${money(getOrderTotal(order))}
Paid: ${money(getOrderPaid(order))}
Balance: ${money(getOrderBalance(order))}`;
  }

  function sendInvoiceEmail(order: SalesOrder) {
    if (!order.customerEmail) {
      alert("Customer email is missing.");
      return;
    }

    const subject = encodeURIComponent(`Invoice ${order.id}`);
    const body = encodeURIComponent(buildInvoiceMessage(order));

    window.open(
      `mailto:${order.customerEmail}?subject=${subject}&body=${body}`,
      "_blank"
    );
  }

  function sendInvoiceWhatsApp(order: SalesOrder) {
    const phone = (order.customerWhatsApp || order.customerPhone || "").replace(
      /\D/g,
      ""
    );

    const message = encodeURIComponent(buildInvoiceMessage(order));

    const url = phone
      ? `https://wa.me/${phone}?text=${message}`
      : `https://wa.me/?text=${message}`;

    window.open(url, "_blank");
  }

  function printInvoice(order: SalesOrder) {
    const itemRows = order.items
      .map(
        (item) => `
          <tr>
            <td><b>${escapeHtml(item.productName)}</b></td>
            <td>${escapeHtml(item.modelNo || "-")}</td>
            <td>${escapeHtml(item.sku || "-")}</td>
            <td>${escapeHtml(item.size || "-")}</td>
            <td class="right">${Number(item.quantity || 0)}</td>
            <td class="right">${money(Number(item.unitPrice || 0))}</td>
            <td class="right"><b>${money(
              Number(item.quantity || 0) * Number(item.unitPrice || 0)
            )}</b></td>
          </tr>
        `
      )
      .join("");

    const totalQty = order.items.reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0
    );

    const html = `
      <html>
        <head>
          <title>${escapeHtml(order.id)}</title>
          <style>
            @page { size: letter; margin: 0.45in; }
            * { box-sizing: border-box; }
            html, body { margin: 0; padding: 0; background: #e5e7eb; color: #111; font-family: Arial, sans-serif; }
            .toolbar { position: sticky; top: 0; z-index: 10; display: flex; justify-content: center; gap: 10px; padding: 14px; background: #e5e7eb; border-bottom: 1px solid #d4d4d8; }
            .btn { border: 0; border-radius: 12px; padding: 11px 18px; font-weight: 800; cursor: pointer; }
            .btn-primary { background: #111; color: #facc15; }
            .btn-secondary { background: white; color: #111; }
            .sheet { width: 8in; min-height: 10.2in; margin: 22px auto; padding: 0.42in; background: white; box-shadow: 0 18px 45px rgba(0,0,0,.22); }
            .header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 4px solid #111; padding-bottom: 18px; margin-bottom: 22px; }
            .eyebrow { font-size: 10px; font-weight: 900; letter-spacing: 3px; color: #666; text-transform: uppercase; }
            h1 { font-size: 34px; line-height: 1; margin: 7px 0; }
            h2 { margin: 0 0 10px; font-size: 18px; }
            h3 { margin: 22px 0 10px; font-size: 18px; }
            .total { background: #111; color: white; border-radius: 16px; padding: 14px 18px; text-align: right; min-width: 170px; height: fit-content; }
            .total strong { display: block; color: #facc15; font-size: 25px; margin-top: 4px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 22px; }
            .box { background: #f4f4f5; border-radius: 16px; padding: 16px; min-height: 115px; }
            .small { font-size: 12px; color: #444; line-height: 1.55; }
            table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
            th { background: #111; color: white; text-align: left; padding: 7px; font-size: 9px; text-transform: uppercase; }
            td { border-bottom: 1px solid #ddd; padding: 7px; }
            .right { text-align: right; }
            .amount-due { margin-top: 24px; margin-left: auto; width: 250px; background: #111; color: white; border-radius: 16px; padding: 16px; }
            .amount-due strong { color: #facc15; font-size: 26px; display: block; margin-top: 4px; }
            .footer { margin-top: 24px; border-top: 1px solid #ddd; padding-top: 10px; color: #666; font-size: 10px; }
            @media print { html, body { background: white; } .toolbar { display: none; } .sheet { width: auto; min-height: auto; margin: 0; padding: 0; box-shadow: none; } .box, tr, .amount-due { break-inside: avoid; } }
          </style>
        </head>
        <body>
          <div class="toolbar">
            <button class="btn btn-primary" onclick="window.print()">Print / Save PDF</button>
            <button class="btn btn-secondary" onclick="window.close()">Close</button>
          </div>

          <div class="sheet">
            <div class="header">
              <div>
                <div class="eyebrow">Customer Invoice / Sales Order</div>
                <h1>${escapeHtml(order.id)}</h1>
                <div class="small">Date: ${escapeHtml(order.date)}</div>
              </div>
              <div class="total">
                <div class="eyebrow">Balance Due</div>
                <strong>${money(getOrderBalance(order))}</strong>
              </div>
            </div>

            <div class="grid">
              <div class="box">
                <div class="eyebrow">Bill To</div>
                <h2>${escapeHtml(order.customerName)}</h2>
                <div class="small">
                  ${order.customerEmail ? `<div><b>Email:</b> ${escapeHtml(order.customerEmail)}</div>` : ""}
                  ${order.customerPhone ? `<div><b>Phone:</b> ${escapeHtml(order.customerPhone)}</div>` : ""}
                  ${order.customerWhatsApp ? `<div><b>WhatsApp:</b> ${escapeHtml(order.customerWhatsApp)}</div>` : ""}
                </div>
              </div>

              <div class="box">
                <div class="eyebrow">Summary</div>
                <div class="small"><b>Total:</b> ${money(getOrderTotal(order))}</div>
                <div class="small"><b>Paid:</b> ${money(getOrderPaid(order))}</div>
                <div class="small"><b>Balance:</b> ${money(getOrderBalance(order))}</div>
                <div class="small"><b>Payment Status:</b> ${getPaymentStatus(order)}</div>
                <div class="small"><b>Items Sold:</b> ${totalQty}</div>
              </div>
            </div>

            <h3>Items</h3>
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Model</th>
                  <th>SKU</th>
                  <th>Size</th>
                  <th class="right">Qty</th>
                  <th class="right">Unit Price</th>
                  <th class="right">Total</th>
                </tr>
              </thead>
              <tbody>${itemRows}</tbody>
            </table>

            <div class="amount-due">
              <div class="eyebrow">Balance Due</div>
              <strong>${money(getOrderBalance(order))}</strong>
            </div>

            <div class="footer">
              Generated by Halfi Inventory System · ${new Date().toLocaleString()}
            </div>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      alert("Popup blocked. Please allow popups to print.");
      return;
    }

    printWindow.document.write(html);
    printWindow.document.close();
  }

  return (
    <main className="min-h-screen bg-zinc-100 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-3xl bg-black p-8 text-white">
          <h1 className="text-4xl font-black tracking-widest text-amber-300">
            SALES ORDERS
          </h1>
          <p className="mt-2 text-zinc-300">
            Create a sale, reduce inventory, print/send invoice, and track payment.
          </p>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <StatCard label="Sales Orders" value={String(orders.length)} />
          <StatCard label="Items Sold" value={String(totalItemsSold)} />
          <StatCard label="Sales Total" value={money(totalSales)} />
          <StatCard label="Customer Owes" value={money(totalOwed)} color="text-amber-700" />
        </div>

        <div className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-2xl font-bold">Create Sale / Invoice</h2>

          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="text-sm font-bold">Customer</label>

              <div className="mt-2 flex gap-2">
                <select
                  value={customerName}
                  onChange={(e) => selectCustomer(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3"
                >
                  <option value="">Select customer</option>

                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.name}>
                      {customer.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setShowCustomerPopup(true)}
                  className="rounded-xl bg-black px-4 py-3 text-xl font-black text-amber-300"
                  title="Add customer"
                >
                  +
                </button>
              </div>
            </div>

            <Input label="Customer Email" value={customerEmail} setValue={setCustomerEmail} placeholder="customer@email.com" />
            <Input label="Customer Phone" value={customerPhone} setValue={setCustomerPhone} placeholder="Phone number" />
            <Input label="Customer WhatsApp" value={customerWhatsApp} setValue={setCustomerWhatsApp} placeholder="WhatsApp number" />
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
                        {item.productName} | Model: {item.modelNo || "-"} |
                        Size: {item.size || "-"} | Stock: {stock}
                      </option>
                    );
                  })}
                </select>
              </div>

              <Input label="Qty" type="number" value={String(qty)} setValue={(value) => setQty(Number(value))} placeholder="Qty" />
              <Input label="Unit Price" type="number" value={unitPrice} setValue={setUnitPrice} placeholder="Price" />

              <div className="flex items-end">
                <button
                  type="button"
                  disabled={!canAddItem}
                  onClick={addItemToCart}
                  className={`w-full rounded-xl px-5 py-3 font-bold ${
                    !canAddItem
                      ? "cursor-not-allowed bg-zinc-300 text-zinc-500"
                      : "bg-black text-amber-300"
                  }`}
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
                  {selectedInventoryItem.modelNo || "-"} · SKU:{" "}
                  {selectedInventoryItem.sku || "-"} · Size:{" "}
                  {selectedInventoryItem.size || "-"}
                </p>
              </div>
            )}

            {qtyTooHigh && (
              <p className="mt-3 rounded-xl bg-red-100 p-3 font-bold text-red-700">
                You chose {qty}, but only {selectedStock} are in stock.
              </p>
            )}

            {qtyInvalid && selectedInventoryItem && (
              <p className="mt-3 rounded-xl bg-red-100 p-3 font-bold text-red-700">
                Quantity must be at least 1.
              </p>
            )}
          </div>

          {cart.length > 0 && (
            <div className="mt-6 overflow-x-auto rounded-2xl border">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className="bg-zinc-100 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="p-4">Product</th>
                    <th className="p-4">Model</th>
                    <th className="p-4">SKU</th>
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
                      <td className="p-4">{item.sku || "-"}</td>
                      <td className="p-4">{item.size || "-"}</td>
                      <td className="p-4 font-black">{item.quantity}</td>
                      <td className="p-4">{item.availableBeforeSale}</td>
                      <td className="p-4">{money(Number(item.unitPrice || 0))}</td>
                      <td className="p-4 font-bold">
                        {money(Number(item.quantity || 0) * Number(item.unitPrice || 0))}
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

          <div className="mt-5 rounded-2xl bg-zinc-100 p-5">
            <h3 className="mb-4 text-xl font-bold">Payment Now</h3>

            <div className="grid gap-4 md:grid-cols-4">
              <Input label="Amount Paid Now" type="number" value={salePaymentAmount} setValue={setSalePaymentAmount} placeholder="0 or full amount" />

              <div>
                <label className="text-sm font-bold">Method</label>
                <select
                  value={salePaymentMethod}
                  onChange={(e) => setSalePaymentMethod(e.target.value as PaymentMethod)}
                  className="mt-2 w-full rounded-xl border bg-white px-4 py-3 font-bold"
                >
                  <option value="Cash">Cash</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Check">Check</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <Input label="Payment Note" value={salePaymentNote} setValue={setSalePaymentNote} placeholder="Optional note" />

              <div className="rounded-xl bg-white p-4">
                <p className="text-sm text-zinc-500">Balance After Payment</p>
                <p className="text-2xl font-black">
                  {money(Math.max(cartSubtotal - Number(salePaymentAmount || 0), 0))}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-zinc-100 p-5">
            <div>
              <p className="text-sm text-zinc-500">Invoice Total</p>
              <p className="text-3xl font-black">{money(cartSubtotal)}</p>
            </div>

            <button
              type="button"
              onClick={completeSalesOrder}
              className="rounded-xl bg-black px-5 py-3 font-bold text-amber-300"
            >
              Complete Sale / Invoice & Update Inventory
            </button>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-2xl font-bold">Saved Sales / Invoices</h2>

          {orders.length === 0 ? (
            <p className="text-zinc-500">No sales yet.</p>
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
                        Total: {money(getOrderTotal(order))} · Paid:{" "}
                        {money(getOrderPaid(order))} · Owe:{" "}
                        {money(getOrderBalance(order))}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-4 py-2 text-sm font-bold ${
                        getPaymentStatus(order) === "Paid"
                          ? "bg-emerald-100 text-emerald-800"
                          : getPaymentStatus(order) === "Partially Paid"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {getPaymentStatus(order)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
            <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
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

              <div className="mb-6 grid gap-4 md:grid-cols-4">
                <StatCard label="Invoice Total" value={money(getOrderTotal(selectedOrder))} small />
                <StatCard label="Paid" value={money(getOrderPaid(selectedOrder))} small color="text-emerald-700" />
                <StatCard label="Balance Due" value={money(getOrderBalance(selectedOrder))} small color="text-amber-700" />
                <StatCard label="Payment Status" value={getPaymentStatus(selectedOrder)} small />
              </div>

              {getOrderBalance(selectedOrder) > 0 && (
                <div className="mb-6 rounded-2xl bg-zinc-100 p-5">
                  <h3 className="mb-4 text-xl font-bold">Record Payment</h3>

                  <div className="grid gap-4 md:grid-cols-4">
                    <Input label="Amount" type="number" value={extraPaymentAmount} setValue={setExtraPaymentAmount} placeholder={money(getOrderBalance(selectedOrder))} />

                    <div>
                      <label className="text-sm font-bold">Method</label>
                      <select
                        value={extraPaymentMethod}
                        onChange={(e) => setExtraPaymentMethod(e.target.value as PaymentMethod)}
                        className="mt-2 w-full rounded-xl border bg-white px-4 py-3 font-bold"
                      >
                        <option value="Cash">Cash</option>
                        <option value="Credit Card">Credit Card</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Check">Check</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <Input label="Note" value={extraPaymentNote} setValue={setExtraPaymentNote} placeholder="Optional note" />

                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => recordExtraPayment(selectedOrder)}
                        className="w-full rounded-xl bg-black px-5 py-3 font-bold text-amber-300"
                      >
                        Save Payment
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {(selectedOrder.payments || []).length > 0 && (
                <div className="mb-6 rounded-2xl bg-zinc-100 p-5">
                  <h3 className="mb-3 text-xl font-bold">Payments</h3>

                  <div className="space-y-2">
                    {selectedOrder.payments?.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex justify-between rounded-xl bg-white p-3"
                      >
                        <span>
                          {payment.date} · {payment.method}
                          {payment.note ? ` · ${payment.note}` : ""}
                        </span>

                        <span className="font-black">{money(payment.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => printInvoice(selectedOrder)}
                  className="rounded-xl bg-black px-5 py-3 font-bold text-amber-300"
                >
                  Print Invoice
                </button>

                <button
                  type="button"
                  onClick={() => sendInvoiceEmail(selectedOrder)}
                  className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white"
                >
                  Email Invoice
                </button>

                <button
                  type="button"
                  onClick={() => sendInvoiceWhatsApp(selectedOrder)}
                  className="rounded-xl bg-green-600 px-5 py-3 font-bold text-white"
                >
                  WhatsApp Invoice
                </button>

                <button
                  type="button"
                  onClick={() => deleteSalesOrder(selectedOrder)}
                  className="rounded-xl bg-red-600 px-5 py-3 font-bold text-white"
                >
                  Delete Sale & Restore Inventory
                </button>
              </div>

              <div className="overflow-x-auto rounded-2xl border">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="bg-zinc-100 text-xs uppercase text-zinc-500">
                    <tr>
                      <th className="p-4">Product</th>
                      <th className="p-4">Model</th>
                      <th className="p-4">SKU</th>
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
                        <td className="p-4">{item.sku || "-"}</td>
                        <td className="p-4">{item.size || "-"}</td>
                        <td className="p-4 font-black">{item.quantity}</td>
                        <td className="p-4">{money(Number(item.unitPrice || 0))}</td>
                        <td className="p-4 font-bold">
                          {money(Number(item.quantity || 0) * Number(item.unitPrice || 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {showCustomerPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
            <div className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl">
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <h2 className="text-3xl font-black">Create Customer</h2>
                  <p className="mt-1 text-zinc-500">
                    This customer will also be saved to the Customers page.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowCustomerPopup(false)}
                  className="rounded-xl bg-zinc-100 px-4 py-2 font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <input
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="Customer name"
                  className="rounded-xl border px-4 py-3"
                />

                <input
                  value={newCustomerEmail}
                  onChange={(e) => setNewCustomerEmail(e.target.value)}
                  placeholder="Customer email"
                  className="rounded-xl border px-4 py-3"
                />

                <input
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  placeholder="Phone"
                  className="rounded-xl border px-4 py-3"
                />

                <input
                  value={newCustomerWhatsapp}
                  onChange={(e) => setNewCustomerWhatsapp(e.target.value)}
                  placeholder="WhatsApp"
                  className="rounded-xl border px-4 py-3"
                />

                <input
                  value={newCustomerAddress}
                  onChange={(e) => setNewCustomerAddress(e.target.value)}
                  placeholder="Address"
                  className="rounded-xl border px-4 py-3 md:col-span-2"
                />
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={createCustomerFromPopup}
                  className="rounded-xl bg-black px-5 py-3 font-bold text-amber-300"
                >
                  Save Customer
                </button>

                <button
                  type="button"
                  onClick={() => setShowCustomerPopup(false)}
                  className="rounded-xl border px-5 py-3 font-bold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function Input({
  label,
  value,
  setValue,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  setValue: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="text-sm font-bold">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-xl border px-4 py-3"
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  color = "text-black",
  small = false,
}: {
  label: string;
  value: string;
  color?: string;
  small?: boolean;
}) {
  return (
    <div className={small ? "rounded-2xl bg-zinc-100 p-4" : "rounded-3xl bg-white p-5 shadow-sm"}>
      <p className="text-sm text-zinc-500">{label}</p>
      <p className={`${small ? "text-xl" : "mt-2 text-3xl"} font-black ${color}`}>
        {value}
      </p>
    </div>
  );
}
