"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AlertModal from "../components/AlertModal";
import ConfirmModal from "../components/ConfirmModal";

type POItem = {
  id: string;
  catalogItemId?: string;
  productName: string;
  modelNo: string;
  sku?: string;
  size: string;
  quantity: number;
  unitCost: number;
  sellingPrice?: number;
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
  sellingPrice?: number;
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

  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<
    "success" | "error" | "warning" | "info"
  >("info");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);

  function showAlert(
    message: string,
    type: "success" | "error" | "warning" | "info" = "info",
  ) {
    setAlertMessage(message);
    setAlertType(type);
    setAlertOpen(true);
  }

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

  if (foundPO) {
    setSelectedOrder(foundPO);
  }

  localStorage.removeItem("halfi_open_po_id");
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
      showAlert(data.error || "Could not import PDF.", "error");
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
      sellingPrice: Number(item.sellingPrice || item.unitCost || 0),
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
        sellingPrice: 0,
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
                field === "quantity" ||
                field === "unitCost" ||
                field === "sellingPrice"
                  ? Number(value)
                  : value,
            }
          : item,
      ),
    );
  }

  function savePurchaseOrder() {
    if (items.length === 0) {
      showAlert("Add at least one item before saving.", "error");
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

    showAlert("Purchase order saved as Draft.", "success");
  }

  function buildPOMessage(order: PurchaseOrder) {
    const lines = order.items
      .map(
        (item) =>
          `${item.productName} | Model: ${item.modelNo || "-"} | Size: ${
            item.size
          } | Qty: ${item.quantity} | Unit Cost: $${item.unitCost} | Selling Price: $${Number(item.sellingPrice || item.unitCost || 0)}`,
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
    const savedInventory = localStorage.getItem("halfi_items") ?? "[]";
    const currentInventory = JSON.parse(savedInventory);

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
      sellingPrice: Number(item.sellingPrice || item.unitCost || 0),
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
          sellingPrice: Number(
            newItem.sellingPrice ||
              mergedInventory[existingIndex].sellingPrice ||
              newItem.unitCost ||
              0,
          ),
          status: getInventoryStatus(finalQty),
        };
      } else {
        mergedInventory.push(newItem);
      }
    });

    localStorage.setItem("halfi_items", JSON.stringify(mergedInventory));
    const savedReceived = localStorage.getItem("halfi_receive_inventory") ?? "[]";
const receivedRecords = JSON.parse(savedReceived);

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

    showAlert("Purchase order received and added to inventory.", "success");
  }

  function deletePurchaseOrder(order: PurchaseOrder) {
    setConfirmMessage(
      "Are you sure? This deletes the PO, related bill, related payments, received record, and removes matching items from inventory.",
    );

    setConfirmAction(() => () => {
      actuallyDeletePurchaseOrder(order);
    });

    setConfirmOpen(true);
  }

  function actuallyDeletePurchaseOrder(order: PurchaseOrder) {
    const savedInventory = localStorage.getItem("halfi_items") ?? "[]";
    const currentInventory = JSON.parse(savedInventory);

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

    const savedBills = localStorage.getItem("halfi_bills") ?? "[]";
    const bills = JSON.parse(savedBills);
    const updatedBills = bills.filter((bill: any) => bill.poId !== order.id);
    localStorage.setItem("halfi_bills", JSON.stringify(updatedBills));

    const savedPayments = localStorage.getItem("halfi_payments_made") ?? "[]";
    const payments = JSON.parse(savedPayments);
    const updatedPayments = payments.filter(
      (payment: any) => payment.poId !== order.id,
    );
    localStorage.setItem(
      "halfi_payments_made",
      JSON.stringify(updatedPayments),
    );

    const savedReceived = localStorage.getItem("halfi_receive_inventory") ?? "[]";
    const received = JSON.parse(savedReceived);
    const updatedReceived = received.filter(
      (record: any) => record.poId !== order.id,
    );
    localStorage.setItem(
      "halfi_receive_inventory",
      JSON.stringify(updatedReceived),
    );

    if (selectedOrder?.id === order.id) setSelectedOrder(null);

    showAlert(
      "PO, related bill, related payments, received record, and inventory items deleted.",
      "warning",
    );
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

  const printVendor = printOrder
    ? vendors.find((vendorItem) => vendorItem.name === printOrder.vendor)
    : null;

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
                        <th className="p-3">Selling Price</th>
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
                                          sellingPrice: Number(
                                            selected.sellingPrice ||
                                              line.sellingPrice ||
                                              selected.unitCost ||
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

                          <td className="p-3">
                            <input
                              type="number"
                              value={item.sellingPrice || ""}
                              onChange={(e) =>
                                updateLine(item.id, "sellingPrice", e.target.value)
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
                  data-readonly-allow="true"
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
                  onClick={() => setPrintOrder(selectedOrder)}
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
                      showAlert("Inventory already received for this PO.", "warning");
                      return;
                    }

                    if (getBalance(selectedOrder) > 0) {
                      showAlert(
                        "PO must be fully paid before receiving inventory.",
                        "error",
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
                      <th className="p-4">Selling Price</th>
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
                        <td className="p-4">${item.sellingPrice || item.unitCost || 0}</td>
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

        {printOrder && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-6 print:block print:bg-white print:p-0">
            <style>{`
              @page {
                size: letter;
                margin: 0.35in;
              }

              @media print {
                body * {
                  visibility: hidden;
                }

                #po-print-area,
                #po-print-area * {
                  visibility: visible;
                }

                #po-print-area {
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 100%;
                  margin: 0;
                  padding: 0;
                }

                .no-print {
                  display: none !important;
                }

                .print-wrapper {
                  max-height: none !important;
                  overflow: visible !important;
                  box-shadow: none !important;
                  border-radius: 0 !important;
                  padding: 0 !important;
                }

                .print-card {
                  box-shadow: none !important;
                  border: none !important;
                  padding: 0 !important;
                }

                .avoid-break {
                  break-inside: avoid;
                  page-break-inside: avoid;
                }

                table {
                  page-break-inside: auto;
                }

                tr {
                  page-break-inside: avoid;
                  page-break-after: auto;
                }
              }
            `}</style>

            <div className="print-wrapper max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
              <div className="no-print mb-5 flex items-center justify-between">
                <h2 className="text-2xl font-black">Print Preview</h2>

                <div className="flex gap-3">
                  <button
                    type="button"
                    data-readonly-allow="true"
                    onClick={() => window.print()}
                    className="rounded-xl bg-black px-5 py-3 font-bold text-amber-300"
                  >
                    Print / Save PDF
                  </button>

                  <button
                    type="button"
                    data-readonly-allow="true"
                    onClick={() => setPrintOrder(null)}
                    className="rounded-xl bg-zinc-100 px-5 py-3 font-bold"
                  >
                    Close
                  </button>
                </div>
              </div>

              <div
                id="po-print-area"
                className="print-card rounded-3xl border bg-white p-8 shadow-sm"
              >
                <div className="avoid-break mb-8 flex items-start justify-between gap-8 border-b-4 border-black pb-6">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500">
                      Purchase Order
                    </p>
                    <h1 className="mt-2 text-5xl font-black tracking-tight">
                      {printOrder.id}
                    </h1>
                    <p className="mt-2 text-sm text-zinc-500">
                      Created: {printOrder.date}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-black px-6 py-4 text-right text-white">
                    <p className="text-xs uppercase tracking-widest text-zinc-300">
                      Status
                    </p>
                    <p className="mt-1 text-2xl font-black text-amber-300">
                      {printOrder.status}
                    </p>
                  </div>
                </div>

                <div className="avoid-break mb-8 grid gap-5 md:grid-cols-2">
                  <div className="rounded-3xl bg-zinc-100 p-5">
                    <p className="mb-3 text-xs font-black uppercase tracking-widest text-zinc-500">
                      Vendor
                    </p>
                    <h2 className="text-2xl font-black">{printOrder.vendor}</h2>

                    <div className="mt-4 space-y-1 text-sm text-zinc-700">
                      {printVendor?.contactName && (
                        <p>
                          <b>Contact:</b> {printVendor.contactName}
                        </p>
                      )}

                      {(printVendor?.email || printOrder.vendorEmail) && (
                        <p>
                          <b>Email:</b>{" "}
                          {printVendor?.email || printOrder.vendorEmail}
                        </p>
                      )}

                      {(printVendor?.whatsapp || printOrder.vendorWhatsApp) && (
                        <p>
                          <b>WhatsApp:</b>{" "}
                          {printVendor?.whatsapp || printOrder.vendorWhatsApp}
                        </p>
                      )}

                      {printVendor?.address && (
                        <p>
                          <b>Address:</b> {printVendor.address}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-3xl bg-zinc-100 p-5">
                    <p className="mb-3 text-xs font-black uppercase tracking-widest text-zinc-500">
                      Payment Summary
                    </p>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-zinc-500">Grand Total</p>
                        <p className="text-2xl font-black">
                          {formatMoney(getGrandTotal(printOrder))}
                        </p>
                      </div>

                      <div>
                        <p className="text-zinc-500">Still Owe</p>
                        <p className="text-2xl font-black">
                          {formatMoney(getBalance(printOrder))}
                        </p>
                      </div>

                      <div>
                        <p className="text-zinc-500">Amount Paid</p>
                        <p className="text-xl font-black">
                          {formatMoney(Number(printOrder.amountPaid || 0))}
                        </p>
                      </div>

                      <div>
                        <p className="text-zinc-500">Total Qty</p>
                        <p className="text-xl font-black">
                          {getOrderQty(printOrder)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="avoid-break mb-8">
                  <h3 className="mb-3 text-xl font-black">Cost Summary</h3>

                  <div className="grid gap-3 md:grid-cols-4">
                    <div className="rounded-2xl border p-4">
                      <p className="text-xs uppercase text-zinc-500">
                        Items Subtotal
                      </p>
                      <p className="mt-1 text-lg font-black">
                        {formatMoney(getItemSubtotal(printOrder.items))}
                      </p>
                    </div>

                    <div className="rounded-2xl border p-4">
                      <p className="text-xs uppercase text-zinc-500">Shipping</p>
                      <p className="mt-1 text-lg font-black">
                        {formatMoney(
                          Number(getExtraCosts(printOrder).shippingFee || 0),
                        )}
                      </p>
                    </div>

                    <div className="rounded-2xl border p-4">
                      <p className="text-xs uppercase text-zinc-500">
                        Insurance
                      </p>
                      <p className="mt-1 text-lg font-black">
                        {formatMoney(
                          Number(getExtraCosts(printOrder).insuranceFee || 0),
                        )}
                      </p>
                    </div>

                    <div className="rounded-2xl border p-4">
                      <p className="text-xs uppercase text-zinc-500">Discount</p>
                      <p className="mt-1 text-lg font-black">
                        {formatMoney(
                          Number(getExtraCosts(printOrder).discount || 0),
                        )}
                      </p>
                    </div>

                    <div className="rounded-2xl border p-4">
                      <p className="text-xs uppercase text-zinc-500">Bank Fee</p>
                      <p className="mt-1 text-lg font-black">
                        {formatMoney(
                          Number(getExtraCosts(printOrder).bankFee || 0),
                        )}
                      </p>
                    </div>

                    <div className="rounded-2xl border p-4">
                      <p className="text-xs uppercase text-zinc-500">Other Fee</p>
                      <p className="mt-1 text-lg font-black">
                        {formatMoney(
                          Number(getExtraCosts(printOrder).otherFee || 0),
                        )}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-black p-4 text-white md:col-span-2">
                      <p className="text-xs uppercase text-zinc-300">
                        Grand Total
                      </p>
                      <p className="mt-1 text-2xl font-black text-amber-300">
                        {formatMoney(getGrandTotal(printOrder))}
                      </p>
                    </div>
                  </div>
                </div>

                {(printOrder.payments || []).length > 0 && (
                  <div className="avoid-break mb-8">
                    <h3 className="mb-3 text-xl font-black">Payments</h3>

                    <table className="w-full border-collapse overflow-hidden rounded-2xl text-sm">
                      <thead>
                        <tr className="bg-zinc-100 text-left text-xs uppercase text-zinc-500">
                          <th className="p-3">Date</th>
                          <th className="p-3">Method</th>
                          <th className="p-3">Note</th>
                          <th className="p-3 text-right">Amount</th>
                        </tr>
                      </thead>

                      <tbody>
                        {printOrder.payments?.map((payment) => (
                          <tr key={payment.id} className="border-b">
                            <td className="p-3">{payment.date}</td>
                            <td className="p-3">{payment.method || "-"}</td>
                            <td className="p-3">{payment.note || "-"}</td>
                            <td className="p-3 text-right font-black">
                              {formatMoney(Number(payment.amount || 0))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div>
                  <h3 className="mb-3 text-xl font-black">Items</h3>

                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-black text-left text-xs uppercase text-white">
                        <th className="p-3">Product</th>
                        <th className="p-3">Model</th>
                        <th className="p-3">SKU</th>
                        <th className="p-3">Size</th>
                        <th className="p-3 text-right">Qty</th>
                        <th className="p-3 text-right">Unit Cost</th>
                        <th className="p-3 text-right">Selling Price</th>
                        <th className="p-3 text-right">Total</th>
                      </tr>
                    </thead>

                    <tbody>
                      {printOrder.items.map((item) => (
                        <tr key={item.id} className="border-b">
                          <td className="p-3 font-bold">{item.productName}</td>
                          <td className="p-3">{item.modelNo}</td>
                          <td className="p-3">{item.sku || "-"}</td>
                          <td className="p-3">{item.size}</td>
                          <td className="p-3 text-right font-black">
                            {item.quantity}
                          </td>
                          <td className="p-3 text-right">
                            {formatMoney(Number(item.unitCost || 0))}
                          </td>
                          <td className="p-3 text-right">
                            {formatMoney(Number(item.sellingPrice || item.unitCost || 0))}
                          </td>
                          <td className="p-3 text-right font-black">
                            {formatMoney(
                              Number(item.quantity || 0) *
                                Number(item.unitCost || 0),
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="avoid-break mt-8 border-t pt-5 text-xs text-zinc-500">
                  <p>
                    Generated by Halfi Inventory System · {new Date().toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <AlertModal
          open={alertOpen}
          message={alertMessage}
          type={alertType}
          onClose={() => setAlertOpen(false)}
        />

        <ConfirmModal
          open={confirmOpen}
          message={confirmMessage}
          danger
          confirmText="Delete"
          onCancel={() => {
            setConfirmOpen(false);
            setConfirmAction(null);
          }}
          onConfirm={() => {
            if (confirmAction) {
              confirmAction();
            }

            setConfirmOpen(false);
            setConfirmAction(null);
          }}
        />

      </div>
    </main>
  );
}
