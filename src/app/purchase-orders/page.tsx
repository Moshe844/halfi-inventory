"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type POItem = {
  id: string;
  catalogItemId?: string;
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

type CatalogItem = {
  id: string;
  productName: string;
  modelNo: string;
  sku: string;
  size: string;
  unitCost?: number;
};

type PaymentMethod = "Bank Transfer" | "Credit Card" | "Cash" | "Other";

type PurchaseOrderStatus =
  | "Draft"
  | "Issued"
  | "Partially Paid"
  | "Paid"
  | "Received"
  | "Closed"
  | "Cancelled";

type Payment = {
  id: string;
  date: string;
  amount: number;
  method?: PaymentMethod;
  note?: string;
};

type PurchaseOrder = {
  id: string;
  vendor: string;
  vendorEmail?: string;
  vendorWhatsApp?: string;
  date: string;
  status: PurchaseOrderStatus;
  amountPaid?: number;
  payments?: Payment[];
  extraCosts?: ExtraCosts;
  items: POItem[];
};

type Vendor = {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  address?: string;
  contactName?: string;
};

const defaultExtraCosts: ExtraCosts = {
  shippingFee: 0,
  insuranceFee: 0,
  bankFee: 0,
  otherFee: 0,
  discount: 0,
};

function getInventoryStatus(qty: number) {
  if (qty <= 0) return "Out of Stock";
  if (qty <= 5) return "Low Stock";
  return "In Stock";
}

function getOrderQty(order: PurchaseOrder) {
  return order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
}

function getItemSubtotal(items: POItem[]) {
  return items.reduce(
    (sum, item) =>
      sum + Number(item.quantity || 0) * Number(item.unitCost || 0),
    0,
  );
}

function getExtraCosts(order: { extraCosts?: ExtraCosts }) {
  return order.extraCosts || defaultExtraCosts;
}

function getGrandTotal(order: { items: POItem[]; extraCosts?: ExtraCosts }) {
  const costs = getExtraCosts(order);

  return (
    getItemSubtotal(order.items) +
    Number(costs.shippingFee || 0) +
    Number(costs.insuranceFee || 0) +
    Number(costs.bankFee || 0) +
    Number(costs.otherFee || 0) -
    Number(costs.discount || 0)
  );
}

function getOtherFees(order: { extraCosts?: ExtraCosts }) {
  const costs = getExtraCosts(order);

  return (
    Number(costs.insuranceFee || 0) +
    Number(costs.bankFee || 0) +
    Number(costs.otherFee || 0)
  );
}

function getBalance(order: PurchaseOrder) {
  return getGrandTotal(order) - Number(order.amountPaid || 0);
}

function statusClass(status: PurchaseOrderStatus) {
  if (status === "Draft") return "bg-zinc-100 text-zinc-800";
  if (status === "Issued") return "bg-blue-100 text-blue-800";
  if (status === "Partially Paid") return "bg-yellow-100 text-yellow-800";
  if (status === "Paid") return "bg-green-100 text-green-800";
  if (status === "Received") return "bg-emerald-100 text-emerald-800";
  if (status === "Closed") return "bg-black text-white";
  return "bg-red-100 text-red-800";
}

function formatMoney(value: number) {
  return `$${Number(value || 0).toLocaleString()}`;
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default function PurchaseOrdersPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(
    null,
  );
  const [printOrder, setPrintOrder] = useState<PurchaseOrder | null>(null);
  const [mode, setMode] = useState<"menu" | "manual" | "bulk">("menu");

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendor, setVendor] = useState("Chongqing Langchi Shoes Co., Ltd.");
  const [vendorEmail, setVendorEmail] = useState("");
  const [vendorWhatsApp, setVendorWhatsApp] = useState("");
  const [items, setItems] = useState<POItem[]>([]);
  const [extraCosts, setExtraCosts] = useState<ExtraCosts>(defaultExtraCosts);
  const [loading, setLoading] = useState(false);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);

  useEffect(() => {
    function loadOrders() {
      const saved = localStorage.getItem("halfi_purchase_orders");
      const savedVendors = localStorage.getItem("halfi_vendors");

      const savedCatalog = localStorage.getItem("halfi_product_catalog");
      setCatalogItems(savedCatalog ? JSON.parse(savedCatalog) : []);

      try {
        setVendors(savedVendors ? JSON.parse(savedVendors) : []);
        const parsedOrders = saved ? JSON.parse(saved) : [];
        setOrders(parsedOrders);

        const openPOId = localStorage.getItem("halfi_open_po_id");

        if (openPOId) {
          const foundPO = parsedOrders.find(
            (po: PurchaseOrder) => po.id === openPOId,
          );

          if (foundPO) setSelectedOrder(foundPO);

          localStorage.removeItem("halfi_open_po_id");
        } else {
          setSelectedOrder(null);
        }
      } catch {
        setOrders([]);
      }

      setMode("menu");
    }

    loadOrders();
    window.addEventListener("pageshow", loadOrders);

    return () => {
      window.removeEventListener("pageshow", loadOrders);
    };
  }, []);

  function saveOrders(updated: PurchaseOrder[]) {
    setOrders(updated);
    localStorage.setItem("halfi_purchase_orders", JSON.stringify(updated));
  }

  function updateOrderStatus(id: string, status: PurchaseOrderStatus) {
    const updated = orders.map((order) =>
      order.id === id ? { ...order, status } : order,
    );

    saveOrders(updated);

    if (selectedOrder?.id === id) {
      setSelectedOrder({ ...selectedOrder, status });
    }
  }

  async function uploadPdf(file: File) {
    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/import-pdf", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    console.log("PDF IMPORT DATA:", data);
    setLoading(false);

    if (!res.ok) {
      alert(data.error || "Could not import PDF.");
      return;
    }

    const converted: POItem[] = (data.items || []).map((item: any) => ({
      id: item.id || `${Date.now()}-${Math.random()}`,
      productName: item.productName || "",
      modelNo: item.modelNo || "",
      size: item.size || "",
      sku: item.sku || "",
      quantity: Number(item.pendingQty || item.quantity || 0),
      unitCost: Number(item.unitCost || 0),
    }));

    setItems(converted);

    if (data.extraCosts) {
      setExtraCosts({
        shippingFee: Number(data.extraCosts.shippingFee || 0),
        insuranceFee: Number(data.extraCosts.insuranceFee || 0),
        bankFee: Number(data.extraCosts.bankFee || 0),
        otherFee: Number(data.extraCosts.otherFee || 0),
        discount: Number(data.extraCosts.discount || 0),
      });
    }
  }

  function addManualLine() {
    setItems([
      ...items,
      {
        id: `${Date.now()}-${Math.random()}`,
        productName: "",
        modelNo: "",
        size: "",
        quantity: 0,
        unitCost: 0,
      },
    ]);
  }

  function updateLine(id: string, field: keyof POItem, value: string | number) {
    setItems(
      items.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]:
                field === "quantity" || field === "unitCost"
                  ? Number(value)
                  : value,
            }
          : item,
      ),
    );
  }

  function savePurchaseOrder() {
    if (items.length === 0) {
      alert("Add at least one item before saving.");
      return;
    }

    const newOrder: PurchaseOrder = {
      id: `PO-${Date.now()}`,
      vendor,
      vendorEmail,
      vendorWhatsApp,
      date: new Date().toLocaleDateString(),
      status: "Draft",
      amountPaid: 0,
      payments: [],
      extraCosts,
      items,
    };

    saveOrders([newOrder, ...orders]);

    setItems([]);
    setVendorEmail("");
    setVendorWhatsApp("");
    setExtraCosts(defaultExtraCosts);
    setMode("menu");

    alert("Purchase order saved as Draft.");
  }

  function buildPOMessage(order: PurchaseOrder) {
    const lines = order.items
      .map(
        (item) =>
          `${item.productName} | Model: ${item.modelNo || "-"} | Size: ${
            item.size
          } | Qty: ${item.quantity} | Unit Cost: $${item.unitCost}`,
      )
      .join("\n");

    const costs = getExtraCosts(order);

    return `Purchase Order: ${order.id}

Vendor: ${order.vendor}
Date: ${order.date}

Items:
${lines}

Items Subtotal: $${getItemSubtotal(order.items).toLocaleString()}
Shipping Fee: $${Number(costs.shippingFee || 0).toLocaleString()}
Insurance Fee: $${Number(costs.insuranceFee || 0).toLocaleString()}
Bank Fee: $${Number(costs.bankFee || 0).toLocaleString()}
Other Fee: $${Number(costs.otherFee || 0).toLocaleString()}
Discount: $${Number(costs.discount || 0).toLocaleString()}

Total Qty: ${getOrderQty(order)}
Grand Total: $${getGrandTotal(order).toLocaleString()}`;
  }

  function sendEmail(order: PurchaseOrder) {
    updateOrderStatus(order.id, "Issued");

    const subject = encodeURIComponent(`Purchase Order ${order.id}`);
    const body = encodeURIComponent(buildPOMessage(order));
    const to = order.vendorEmail || "";

    window.open(`mailto:${to}?subject=${subject}&body=${body}`, "_blank");
  }

  function sendWhatsApp(order: PurchaseOrder) {
    updateOrderStatus(order.id, "Issued");

    const message = encodeURIComponent(buildPOMessage(order));
    const phone = (order.vendorWhatsApp || "").replace(/\D/g, "");

    const url = phone
      ? `https://wa.me/${phone}?text=${message}`
      : `https://wa.me/?text=${message}`;

    window.open(url, "_blank");
  }

  function convertPOToBill(order: PurchaseOrder) {
    localStorage.setItem("halfi_pending_bill_po", JSON.stringify(order));
    router.push("/bills");
  }

  function importToInventory(order: PurchaseOrder) {
    const savedInventory = localStorage.getItem("halfi_items");
    const currentInventory = savedInventory ? JSON.parse(savedInventory) : [];

    const newInventoryItems = order.items.map((item) => ({
      id: `${order.id}-${item.productName}-${item.modelNo}-${item.size}`,
      productName: item.productName,
      modelNo: item.modelNo,
      sku: item.sku || "",
      size: item.size,
      quantity: item.quantity,
      pendingQty: item.quantity,
      inStockQty: item.quantity,
      unitCost: item.unitCost,
      status: getInventoryStatus(item.quantity),
    }));

    const mergedInventory = [...currentInventory];

    newInventoryItems.forEach((newItem) => {
      const existingIndex = mergedInventory.findIndex(
        (oldItem: any) =>
          oldItem.productName === newItem.productName &&
          oldItem.modelNo === newItem.modelNo &&
          oldItem.size === newItem.size,
      );

      if (existingIndex >= 0) {
        const oldQty = Number(mergedInventory[existingIndex].quantity || 0);
        const finalQty = oldQty + Number(newItem.quantity || 0);

        mergedInventory[existingIndex] = {
          ...mergedInventory[existingIndex],
          quantity: finalQty,
          pendingQty: finalQty,
          inStockQty: finalQty,
          sku: newItem.sku || mergedInventory[existingIndex].sku || "",
          unitCost: newItem.unitCost,
          status: getInventoryStatus(finalQty),
        };
      } else {
        mergedInventory.push(newItem);
      }
    });

    localStorage.setItem("halfi_items", JSON.stringify(mergedInventory));
    const savedReceived = localStorage.getItem("halfi_receive_inventory");
const receivedRecords = savedReceived ? JSON.parse(savedReceived) : [];

const alreadyReceived = receivedRecords.some(
  (record: any) => record.poId === order.id
);

if (!alreadyReceived) {
  const receiveRecord = {
    id: `REC-${Date.now()}`,
    poId: order.id,
    vendor: order.vendor,
    date: new Date().toLocaleDateString(),
    totalQty: getOrderQty(order),
    totalCost: getGrandTotal(order),
    status: "Received",
    items: order.items,
  };

  localStorage.setItem(
    "halfi_receive_inventory",
    JSON.stringify([receiveRecord, ...receivedRecords])
  );
}

    const updatedOrders = orders.map((po) =>
      po.id === order.id
        ? { ...po, status: "Received" as PurchaseOrderStatus }
        : po,
    );

    saveOrders(updatedOrders);
    setSelectedOrder(null);

    alert("Purchase order received and added to inventory.");
  }

  function deletePurchaseOrder(order: PurchaseOrder) {
    const confirmDelete = window.confirm(
      "Are you sure? This deletes the PO, related bill, related payments, and removes matching items from inventory.",
    );

    if (!confirmDelete) return;

    const savedInventory = localStorage.getItem("halfi_items");
    const currentInventory = savedInventory ? JSON.parse(savedInventory) : [];

    const updatedInventory = currentInventory.filter((inventoryItem: any) => {
      return !order.items.some(
        (poItem) =>
          inventoryItem.productName === poItem.productName &&
          inventoryItem.modelNo === poItem.modelNo &&
          inventoryItem.size === poItem.size,
      );
    });

    localStorage.setItem("halfi_items", JSON.stringify(updatedInventory));
    

    const updatedOrders = orders.filter((po) => po.id !== order.id);
    saveOrders(updatedOrders);

    const savedBills = localStorage.getItem("halfi_bills");
    const bills = savedBills ? JSON.parse(savedBills) : [];
    const updatedBills = bills.filter((bill: any) => bill.poId !== order.id);
    localStorage.setItem("halfi_bills", JSON.stringify(updatedBills));

    const savedPayments = localStorage.getItem("halfi_payments_made");
    const payments = savedPayments ? JSON.parse(savedPayments) : [];
    const updatedPayments = payments.filter(
      (payment: any) => payment.poId !== order.id,
    );
    localStorage.setItem(
      "halfi_payments_made",
      JSON.stringify(updatedPayments),
    );

    if (selectedOrder?.id === order.id) setSelectedOrder(null);

    alert("PO, related bill, related payments, and inventory items deleted.");
  }

  const draftOrders = orders.filter((o) => o.status === "Draft").length;
  const issuedOrders = orders.filter((o) => o.status === "Issued").length;
  const partialOrders = orders.filter(
    (o) => o.status === "Partially Paid",
  ).length;
  const paidOrders = orders.filter((o) => o.status === "Paid").length;
  const receivedOrders = orders.filter((o) => o.status === "Received").length;
  const closedOrders = orders.filter((o) => o.status === "Closed").length;

  const totalPOValue = orders.reduce(
    (sum, order) => sum + getGrandTotal(order),
    0,
  );
  const totalPaid = orders.reduce(
    (sum, order) => sum + Number(order.amountPaid || 0),
    0,
  );
  const totalOwed = totalPOValue - totalPaid;

  const draftOrder: PurchaseOrder = {
    id: "draft",
    vendor,
    date: "",
    status: "Draft",
    items,
    extraCosts,
  };

  const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
  const itemSubtotal = getItemSubtotal(items);
  const draftGrandTotal = getGrandTotal(draftOrder);

  function printPurchaseOrder(order: PurchaseOrder) {
    const vendorInfo = vendors.find((vendorItem) => vendorItem.name === order.vendor);
    const costs = getExtraCosts(order);

    const itemRows = order.items
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(item.productName)}</td>
            <td>${escapeHtml(item.modelNo)}</td>
            <td>${escapeHtml(item.sku || "-")}</td>
            <td>${escapeHtml(item.size)}</td>
            <td class="num">${Number(item.quantity || 0).toLocaleString()}</td>
            <td class="num">${formatMoney(Number(item.unitCost || 0))}</td>
            <td class="num strong">${formatMoney(
              Number(item.quantity || 0) * Number(item.unitCost || 0)
            )}</td>
          </tr>
        `
      )
      .join("");

    const paymentRows = (order.payments || [])
      .map(
        (payment) => `
          <tr>
            <td>${escapeHtml(payment.date)}</td>
            <td>${escapeHtml(payment.method || "-")}</td>
            <td>${escapeHtml(payment.note || "-")}</td>
            <td class="num strong">${formatMoney(Number(payment.amount || 0))}</td>
          </tr>
        `
      )
      .join("");

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(order.id)}</title>
          <style>
            @page {
              size: letter;
              margin: 0.45in;
            }

            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              font-family: Arial, Helvetica, sans-serif;
              color: #111;
              background: white;
              font-size: 12px;
              line-height: 1.35;
            }

            .page {
              width: 100%;
            }

            .top {
              display: flex;
              justify-content: space-between;
              gap: 24px;
              border-bottom: 4px solid #111;
              padding-bottom: 18px;
              margin-bottom: 18px;
            }

            .kicker {
              font-size: 10px;
              letter-spacing: 3px;
              text-transform: uppercase;
              font-weight: 800;
              color: #666;
            }

            h1 {
              margin: 6px 0 0;
              font-size: 30px;
              line-height: 1;
              letter-spacing: -1px;
            }

            .status-box {
              min-width: 145px;
              background: #111;
              color: white;
              border-radius: 14px;
              padding: 14px;
              text-align: right;
            }

            .status-box .status {
              color: #facc15;
              font-size: 22px;
              font-weight: 900;
            }

            .grid-2 {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 14px;
              margin-bottom: 18px;
            }

            .box {
              border: 1px solid #ddd;
              border-radius: 14px;
              padding: 14px;
              break-inside: avoid;
            }

            .box.gray {
              background: #f5f5f5;
              border-color: #f5f5f5;
            }

            .box-title {
              font-size: 10px;
              letter-spacing: 1.7px;
              text-transform: uppercase;
              font-weight: 900;
              color: #666;
              margin-bottom: 8px;
            }

            .vendor-name {
              font-size: 20px;
              font-weight: 900;
              margin-bottom: 8px;
            }

            .summary-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 10px;
              margin-bottom: 18px;
            }

            .summary-card {
              border: 1px solid #ddd;
              border-radius: 12px;
              padding: 10px;
              break-inside: avoid;
            }

            .summary-card.dark {
              background: #111;
              color: white;
              border-color: #111;
              grid-column: span 2;
            }

            .label {
              font-size: 9px;
              text-transform: uppercase;
              letter-spacing: 1px;
              color: #666;
              font-weight: 800;
              margin-bottom: 4px;
            }

            .dark .label {
              color: #ccc;
            }

            .value {
              font-size: 17px;
              font-weight: 900;
            }

            .dark .value {
              color: #facc15;
              font-size: 22px;
            }

            h2 {
              font-size: 18px;
              margin: 18px 0 8px;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
              font-size: 10.5px;
            }

            th {
              background: #111;
              color: white;
              text-align: left;
              padding: 8px 7px;
              text-transform: uppercase;
              font-size: 9px;
              letter-spacing: 0.7px;
            }

            td {
              border-bottom: 1px solid #ddd;
              padding: 7px;
              vertical-align: top;
              word-break: break-word;
            }

            .num {
              text-align: right;
              white-space: nowrap;
            }

            .strong {
              font-weight: 900;
            }

            .footer {
              margin-top: 18px;
              padding-top: 10px;
              border-top: 1px solid #ddd;
              font-size: 10px;
              color: #777;
            }

            .no-payments {
              color: #666;
              font-style: italic;
            }

            @media print {
              body {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
              }

              .box,
              .summary-card,
              .top {
                break-inside: avoid;
              }

              tr {
                break-inside: avoid;
              }
            }
          </style>
        </head>

        <body>
          <div class="page">
            <div class="top">
              <div>
                <div class="kicker">Purchase Order</div>
                <h1>${escapeHtml(order.id)}</h1>
                <div style="margin-top: 8px; color: #555;">
                  Date: ${escapeHtml(order.date)}
                </div>
              </div>

              <div class="status-box">
                <div class="kicker" style="color:#ccc;">Status</div>
                <div class="status">${escapeHtml(order.status)}</div>
              </div>
            </div>

            <div class="grid-2">
              <div class="box gray">
                <div class="box-title">Vendor</div>
                <div class="vendor-name">${escapeHtml(order.vendor)}</div>
                ${
                  vendorInfo?.contactName
                    ? `<div><b>Contact:</b> ${escapeHtml(vendorInfo.contactName)}</div>`
                    : ""
                }
                ${
                  vendorInfo?.email || order.vendorEmail
                    ? `<div><b>Email:</b> ${escapeHtml(vendorInfo?.email || order.vendorEmail)}</div>`
                    : ""
                }
                ${
                  vendorInfo?.whatsapp || order.vendorWhatsApp
                    ? `<div><b>WhatsApp:</b> ${escapeHtml(vendorInfo?.whatsapp || order.vendorWhatsApp)}</div>`
                    : ""
                }
                ${
                  vendorInfo?.address
                    ? `<div><b>Address:</b> ${escapeHtml(vendorInfo.address)}</div>`
                    : ""
                }
              </div>

              <div class="box gray">
                <div class="box-title">Payment Summary</div>
                <div class="summary-grid" style="grid-template-columns: 1fr 1fr; margin: 0;">
                  <div>
                    <div class="label">Grand Total</div>
                    <div class="value">${formatMoney(getGrandTotal(order))}</div>
                  </div>
                  <div>
                    <div class="label">Still Owe</div>
                    <div class="value">${formatMoney(getBalance(order))}</div>
                  </div>
                  <div>
                    <div class="label">Amount Paid</div>
                    <div class="value">${formatMoney(Number(order.amountPaid || 0))}</div>
                  </div>
                  <div>
                    <div class="label">Total Qty</div>
                    <div class="value">${getOrderQty(order).toLocaleString()}</div>
                  </div>
                </div>
              </div>
            </div>

            <h2>Cost Summary</h2>
            <div class="summary-grid">
              <div class="summary-card">
                <div class="label">Items Subtotal</div>
                <div class="value">${formatMoney(getItemSubtotal(order.items))}</div>
              </div>
              <div class="summary-card">
                <div class="label">Shipping</div>
                <div class="value">${formatMoney(Number(costs.shippingFee || 0))}</div>
              </div>
              <div class="summary-card">
                <div class="label">Insurance</div>
                <div class="value">${formatMoney(Number(costs.insuranceFee || 0))}</div>
              </div>
              <div class="summary-card">
                <div class="label">Discount</div>
                <div class="value">${formatMoney(Number(costs.discount || 0))}</div>
              </div>
              <div class="summary-card">
                <div class="label">Bank Fee</div>
                <div class="value">${formatMoney(Number(costs.bankFee || 0))}</div>
              </div>
              <div class="summary-card">
                <div class="label">Other Fee</div>
                <div class="value">${formatMoney(Number(costs.otherFee || 0))}</div>
              </div>
              <div class="summary-card dark">
                <div class="label">Grand Total</div>
                <div class="value">${formatMoney(getGrandTotal(order))}</div>
              </div>
            </div>

            ${
              (order.payments || []).length > 0
                ? `
                  <h2>Payments</h2>
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Method</th>
                        <th>Note</th>
                        <th class="num">Amount</th>
                      </tr>
                    </thead>
                    <tbody>${paymentRows}</tbody>
                  </table>
                `
                : `<p class="no-payments">No payments recorded.</p>`
            }

            <h2>Items</h2>
            <table>
              <thead>
                <tr>
                  <th style="width: 26%;">Product</th>
                  <th style="width: 14%;">Model</th>
                  <th style="width: 18%;">SKU</th>
                  <th style="width: 8%;">Size</th>
                  <th style="width: 8%;" class="num">Qty</th>
                  <th style="width: 13%;" class="num">Unit Cost</th>
                  <th style="width: 13%;" class="num">Total</th>
                </tr>
              </thead>
              <tbody>${itemRows}</tbody>
            </table>

            <div class="footer">
              Generated by Halfi Inventory System · ${new Date().toLocaleString()}
            </div>
          </div>

          <script>
            window.onload = function () {
              setTimeout(function () {
                window.focus();
                window.print();
              }, 250);
            };
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "width=1100,height=800");

    if (!printWindow) {
      alert("Popup blocked. Please allow popups to print this purchase order.");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }

  return (
    <main className="min-h-screen bg-zinc-100 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-3xl bg-black p-8 text-white">
          <h1 className="text-4xl font-black tracking-widest text-amber-300">
            PURCHASE ORDERS
          </h1>
          <p className="mt-2 text-zinc-300">
            Draft → Issued → Bill → Partially Paid/Paid → Received → Closed.
          </p>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          {[
            ["Draft", draftOrders],
            ["Issued", issuedOrders],
            ["Partial Paid", partialOrders],
            ["Paid", paidOrders],
            ["Received", receivedOrders],
            ["Closed", closedOrders],
          ].map(([label, value]) => (
            <div key={label} className="rounded-3xl bg-white p-5 shadow-sm">
              <p className="text-sm text-zinc-500">{label}</p>
              <p className="mt-2 text-3xl font-black">{value}</p>
            </div>
          ))}
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm text-zinc-500">PO Total</p>
            <p className="mt-2 text-3xl font-black">
              ${totalPOValue.toLocaleString()}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm text-zinc-500">Total Paid</p>
            <p className="mt-2 text-3xl font-black">
              ${totalPaid.toLocaleString()}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm text-zinc-500">Total Owed</p>
            <p className="mt-2 text-3xl font-black">
              ${totalOwed.toLocaleString()}
            </p>
          </div>
        </div>

        {mode === "menu" && (
          <div className="mb-6 grid gap-5 md:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setItems([]);
                setExtraCosts(defaultExtraCosts);
                setMode("manual");
              }}
              className="rounded-3xl bg-white p-8 text-left shadow-sm hover:shadow-lg"
            >
              <h2 className="text-2xl font-bold">Create Manual Order</h2>
              <p className="mt-2 text-zinc-500">
                Add product, model, size, quantity, costs, shipping, and fees.
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setItems([]);
                setExtraCosts(defaultExtraCosts);
                setMode("bulk");
              }}
              className="rounded-3xl bg-white p-8 text-left shadow-sm hover:shadow-lg"
            >
              <h2 className="text-2xl font-bold">Import Bulk PDF</h2>
              <p className="mt-2 text-zinc-500">
                Upload vendor PDF and convert it into a PO.
              </p>
            </button>
          </div>
        )}

        {mode !== "menu" && (
          <div className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-bold">
                {mode === "manual"
                  ? "Manual Purchase Order"
                  : "Bulk PDF Purchase Order"}
              </h2>

              <button
                type="button"
                onClick={() => setMode("menu")}
                className="rounded-xl border px-4 py-2 font-bold"
              >
                Back
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="text-sm font-bold">Vendor</label>
                <select
                  value={vendor}
                  onChange={(e) => {
                    const selected = vendors.find(
                      (v) => v.name === e.target.value,
                    );

                    setVendor(e.target.value);

                    if (selected) {
                      setVendorEmail(selected.email || "");
                      setVendorWhatsApp(selected.whatsapp || "");
                    }
                  }}
                  className="mt-2 w-full rounded-xl border px-4 py-3"
                >
                  <option value="">Select vendor</option>

                  {vendors.map((v) => (
                    <option key={v.id} value={v.name}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-bold">Vendor Email</label>
                <input
                  value={vendorEmail}
                  onChange={(e) => setVendorEmail(e.target.value)}
                  placeholder="supplier@email.com"
                  className="mt-2 w-full rounded-xl border px-4 py-3"
                />
              </div>

              <div>
                <label className="text-sm font-bold">Vendor WhatsApp</label>
                <input
                  value={vendorWhatsApp}
                  onChange={(e) => setVendorWhatsApp(e.target.value)}
                  placeholder="15551234567"
                  className="mt-2 w-full rounded-xl border px-4 py-3"
                />
              </div>
            </div>

            {mode === "bulk" && (
              <div className="mt-5 rounded-2xl border border-dashed p-5">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadPdf(file);
                  }}
                />

                {loading && (
                  <p className="mt-3 rounded-xl bg-amber-100 p-3 font-bold text-amber-800">
                    Reading PDF...
                  </p>
                )}
              </div>
            )}

            {mode === "manual" && (
              <button
                type="button"
                onClick={addManualLine}
                className="mt-5 rounded-xl bg-black px-5 py-3 font-bold text-amber-300"
              >
                Add Item Line
              </button>
            )}

            {items.length > 0 && (
              <>
                <div className="mt-6 overflow-x-auto rounded-2xl border">
                  <table className="w-full min-w-[900px] text-left text-sm">
                    <thead className="bg-zinc-100 text-xs uppercase text-zinc-500">
                      <tr>
                        <th className="p-3">Product</th>
                        <th className="p-3">Model No.</th>
                        <th className="p-3">Size</th>
                        <th className="p-4">SKU</th>
                        <th className="p-3">Qty</th>
                        <th className="p-3">Unit Cost</th>
                        <th className="p-3">Total</th>
                      </tr>
                    </thead>

                    <tbody>
                      {items.map((item) => (
                        <tr key={item.id} className="border-t">
                          <td className="p-3">
                            <select
                              value={item.catalogItemId || ""}
                              onChange={(e) => {
                                const selected = catalogItems.find(
                                  (catalogItem) =>
                                    catalogItem.id === e.target.value,
                                );

                                if (!selected) return;

                                setItems(
                                  items.map((line) =>
                                    line.id === item.id
                                      ? {
                                          ...line,
                                          catalogItemId: selected.id,
                                          productName: selected.productName,
                                          modelNo: selected.modelNo,
                                          sku: selected.sku,
                                          size: selected.size,
                                          unitCost: Number(
                                            selected.unitCost ||
                                              line.unitCost ||
                                              0,
                                          ),
                                        }
                                      : line,
                                  ),
                                );
                              }}
                              className="w-full rounded-lg border px-3 py-2"
                            >
                              <option value="">Select product</option>

                              {catalogItems.map((catalogItem) => (
                                <option
                                  key={catalogItem.id}
                                  value={catalogItem.id}
                                >
                                  {catalogItem.productName} |{" "}
                                  {catalogItem.modelNo} | {catalogItem.sku}
                                </option>
                              ))}
                            </select>
                          </td>

                          <td className="p-3">
                            <input
                              value={item.modelNo}
                              onChange={(e) =>
                                updateLine(item.id, "modelNo", e.target.value)
                              }
                              className="w-full rounded-lg border px-3 py-2"
                            />
                          </td>

                          <td className="p-3">
                            <input
                              value={item.size}
                              onChange={(e) =>
                                updateLine(item.id, "size", e.target.value)
                              }
                              className="w-20 rounded-lg border px-3 py-2"
                            />
                          </td>

                          <td className="p-3">
                            <input
                              value={item.sku || ""}
                              onChange={(e) =>
                                updateLine(item.id, "sku", e.target.value)
                              }
                              className="w-32 rounded-lg border px-3 py-2"
                            />
                          </td>

                          <td className="p-3">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) =>
                                updateLine(item.id, "quantity", e.target.value)
                              }
                              className="w-24 rounded-lg border px-3 py-2"
                            />
                          </td>

                          <td className="p-3">
                            <input
                              type="number"
                              value={item.unitCost}
                              onChange={(e) =>
                                updateLine(item.id, "unitCost", e.target.value)
                              }
                              className="w-28 rounded-lg border px-3 py-2"
                            />
                          </td>

                          <td className="p-3 font-bold">
                            ${(item.quantity * item.unitCost).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 rounded-2xl bg-zinc-100 p-5">
                  <h3 className="mb-4 text-xl font-bold">Extra Costs / Fees</h3>

                  <div className="grid gap-4 md:grid-cols-5">
                    <div>
                      <label className="text-sm font-bold">Shipping Fee</label>
                      <input
                        type="number"
                        value={extraCosts.shippingFee}
                        onChange={(e) =>
                          setExtraCosts({
                            ...extraCosts,
                            shippingFee: Number(e.target.value),
                          })
                        }
                        className="mt-2 w-full rounded-xl border px-4 py-3"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-bold">Insurance Fee</label>
                      <input
                        type="number"
                        value={extraCosts.insuranceFee}
                        onChange={(e) =>
                          setExtraCosts({
                            ...extraCosts,
                            insuranceFee: Number(e.target.value),
                          })
                        }
                        className="mt-2 w-full rounded-xl border px-4 py-3"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-bold">Bank Fee</label>
                      <input
                        type="number"
                        value={extraCosts.bankFee}
                        onChange={(e) =>
                          setExtraCosts({
                            ...extraCosts,
                            bankFee: Number(e.target.value),
                          })
                        }
                        className="mt-2 w-full rounded-xl border px-4 py-3"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-bold">Other Fee</label>
                      <input
                        type="number"
                        value={extraCosts.otherFee}
                        onChange={(e) =>
                          setExtraCosts({
                            ...extraCosts,
                            otherFee: Number(e.target.value),
                          })
                        }
                        className="mt-2 w-full rounded-xl border px-4 py-3"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-bold">Discount</label>
                      <input
                        type="number"
                        value={extraCosts.discount}
                        onChange={(e) =>
                          setExtraCosts({
                            ...extraCosts,
                            discount: Number(e.target.value),
                          })
                        }
                        className="mt-2 w-full rounded-xl border px-4 py-3"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-zinc-100 p-5">
                  <div className="grid gap-2 md:grid-cols-3">
                    <p className="font-bold">Total Qty: {totalQty}</p>
                    <p className="font-bold">
                      Items Subtotal: ${itemSubtotal.toLocaleString()}
                    </p>
                    <p className="font-bold">
                      Grand Total: ${draftGrandTotal.toLocaleString()}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={savePurchaseOrder}
                    className="rounded-xl bg-black px-5 py-3 font-bold text-amber-300"
                  >
                    Save as Draft
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-2xl font-bold">Saved Purchase Orders</h2>

          {orders.length === 0 ? (
            <p className="text-zinc-500">No purchase orders saved yet.</p>
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
                      <h3 className="text-xl font-bold">{order.id}</h3>
                      <p className="text-sm text-zinc-500">
                        {order.vendor} · {order.date}
                      </p>
                      <p className="mt-1 font-bold">
                        Qty: {getOrderQty(order)} · Items: $
                        {getItemSubtotal(order.items).toLocaleString()} · Grand
                        Total: ${getGrandTotal(order).toLocaleString()} · Paid:
                        ${Number(order.amountPaid || 0).toLocaleString()} · Owe:
                        ${getBalance(order).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className={`rounded-full px-3 py-1 text-sm font-bold ${statusClass(
                          order.status,
                        )}`}
                      >
                        {order.status}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          sendEmail(order);
                        }}
                        className="rounded-xl bg-blue-600 px-4 py-3 font-bold text-white"
                      >
                        Email
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          sendWhatsApp(order);
                        }}
                        className="rounded-xl bg-green-600 px-4 py-3 font-bold text-white"
                      >
                        WhatsApp
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          convertPOToBill(order);
                        }}
                        className="rounded-xl bg-amber-400 px-4 py-3 font-bold text-black"
                      >
                        Convert to Bill
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePurchaseOrder(order);
                        }}
                        className="rounded-xl bg-red-600 px-4 py-3 font-bold text-white"
                      >
                        Delete PO
                      </button>
                    </div>
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
                  <p className="mt-1 text-zinc-500">{selectedOrder.vendor}</p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="rounded-xl bg-zinc-100 px-4 py-2 font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="mb-6 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
                <div className="rounded-2xl bg-zinc-100 p-4">
                  <p className="text-xs uppercase text-zinc-500">Date</p>
                  <p className="mt-1 text-lg font-black">
                    {selectedOrder.date}
                  </p>
                </div>

                <div className="rounded-2xl bg-zinc-100 p-4">
                  <p className="text-xs uppercase text-zinc-500">Status</p>
                  <select
                    value={selectedOrder.status}
                    onChange={(e) =>
                      updateOrderStatus(
                        selectedOrder.id,
                        e.target.value as PurchaseOrderStatus,
                      )
                    }
                    className="mt-2 w-full rounded-xl border bg-white px-3 py-2 font-bold"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Issued">Issued</option>
                    <option value="Partially Paid">Partially Paid</option>
                    <option value="Paid">Paid</option>
                    <option value="Received">Received</option>
                    <option value="Closed">Closed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="rounded-2xl bg-zinc-100 p-4">
                  <p className="text-xs uppercase text-zinc-500">Total Qty</p>
                  <p className="mt-1 text-lg font-black">
                    {getOrderQty(selectedOrder)}
                  </p>
                </div>

                <div className="rounded-2xl bg-zinc-100 p-4">
                  <p className="text-xs uppercase text-zinc-500">
                    Items Subtotal
                  </p>
                  <p className="mt-1 text-lg font-black">
                    ${getItemSubtotal(selectedOrder.items).toLocaleString()}
                  </p>
                </div>

                <div className="rounded-2xl bg-zinc-100 p-4">
                  <p className="text-xs uppercase text-zinc-500">Shipping</p>
                  <p className="mt-1 text-lg font-black">
                    $
                    {Number(
                      getExtraCosts(selectedOrder).shippingFee || 0,
                    ).toLocaleString()}
                  </p>
                </div>

                <div className="rounded-2xl bg-zinc-100 p-4">
                  <p className="text-xs uppercase text-zinc-500">Insurance</p>
                  <p className="mt-1 text-lg font-black">
                    $
                    {Number(
                      getExtraCosts(selectedOrder).insuranceFee || 0,
                    ).toLocaleString()}
                  </p>
                </div>

                <div className="rounded-2xl bg-zinc-100 p-4">
                  <p className="text-xs uppercase text-zinc-500">Bank Fee</p>
                  <p className="mt-1 text-lg font-black">
                    $
                    {Number(
                      getExtraCosts(selectedOrder).bankFee || 0,
                    ).toLocaleString()}
                  </p>
                </div>

                <div className="rounded-2xl bg-zinc-100 p-4">
                  <p className="text-xs uppercase text-zinc-500">Other Fee</p>
                  <p className="mt-1 text-lg font-black">
                    $
                    {Number(
                      getExtraCosts(selectedOrder).otherFee || 0,
                    ).toLocaleString()}
                  </p>
                </div>

                <div className="rounded-2xl bg-zinc-100 p-4">
                  <p className="text-xs uppercase text-zinc-500">Discount</p>
                  <p className="mt-1 text-lg font-black">
                    $
                    {Number(
                      getExtraCosts(selectedOrder).discount || 0,
                    ).toLocaleString()}
                  </p>
                </div>

                <div className="rounded-2xl bg-zinc-100 p-4">
                  <p className="text-xs uppercase text-zinc-500">Grand Total</p>
                  <p className="mt-1 text-lg font-black">
                    ${getGrandTotal(selectedOrder).toLocaleString()}
                  </p>
                </div>

                <div className="rounded-2xl bg-zinc-100 p-4">
                  <p className="text-xs uppercase text-zinc-500">Amount Paid</p>
                  <p className="mt-1 text-lg font-black">
                    ${Number(selectedOrder.amountPaid || 0).toLocaleString()}
                  </p>
                </div>

                <div className="rounded-2xl bg-zinc-100 p-4">
                  <p className="text-xs uppercase text-zinc-500">Still Owe</p>
                  <p className="mt-1 text-lg font-black">
                    ${getBalance(selectedOrder).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="mb-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => sendEmail(selectedOrder)}
                  className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white"
                >
                  Send Email
                </button>

                <button
                  type="button"
                  onClick={() => sendWhatsApp(selectedOrder)}
                  className="rounded-xl bg-green-600 px-5 py-3 font-bold text-white"
                >
                  Send WhatsApp
                </button>

                <button
                  type="button"
                  onClick={() => convertPOToBill(selectedOrder)}
                  className="rounded-xl bg-amber-400 px-5 py-3 font-bold text-black"
                >
                  Convert to Bill
                </button>

                <button
                  type="button"
                  onClick={() => printPurchaseOrder(selectedOrder)}
                  className="rounded-xl bg-zinc-900 px-5 py-3 font-bold text-white"
                >
                  Print PO
                </button>

                <button
                  type="button"
                  disabled={
                    getBalance(selectedOrder) > 0 ||
                    selectedOrder.status === "Received"
                  }
                  onClick={() => {
                    if (selectedOrder.status === "Received") {
                      alert("Inventory already received for this PO.");
                      return;
                    }

                    if (getBalance(selectedOrder) > 0) {
                      alert(
                        "PO must be fully paid before receiving inventory.",
                      );
                      return;
                    }

                    importToInventory(selectedOrder);
                  }}
                  className={`rounded-xl px-5 py-3 font-bold ${
                    getBalance(selectedOrder) > 0 ||
                    selectedOrder.status === "Received"
                      ? "cursor-not-allowed bg-zinc-300 text-zinc-500"
                      : "bg-black text-amber-300"
                  }`}
                >
                  {selectedOrder.status === "Received"
                    ? "Already Received"
                    : "Receive / Import to Inventory"}
                </button>
              </div>

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
                          {payment.date}
                          {payment.method ? ` · ${payment.method}` : ""}
                          {payment.note ? ` · ${payment.note}` : ""}
                        </span>

                        <span className="font-black">
                          ${Number(payment.amount || 0).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="overflow-x-auto rounded-2xl border">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="bg-zinc-100 text-xs uppercase text-zinc-500">
                    <tr>
                      <th className="p-4">Product</th>
                      <th className="p-4">Model No.</th>
                      <th className="p-4">Size</th>
                       <th className="p-4">SKU</th>
                      <th className="p-4">Qty</th>
                      <th className="p-4">Unit Cost</th>
                      <th className="p-4">Total</th>
                    </tr>
                  </thead>

                  <tbody>
                    {selectedOrder.items.map((item) => (
                      <tr key={item.id} className="border-t">
                        <td className="p-4 font-bold">{item.productName}</td>
                        <td className="p-4">{item.modelNo}</td>
                        <td className="p-4">{item.size}</td>
                        <td className="p-4">{item.sku || "-"}</td>
                        <td className="p-4 font-black">{item.quantity}</td>
                        <td className="p-4">${item.unitCost}</td>
                        <td className="p-4 font-bold">
                          ${(item.quantity * item.unitCost).toLocaleString()}
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
