"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AlertModal from "../components/AlertModal";
import ConfirmModal from "../components/ConfirmModal";

type Payment = {
  id: string;
  billId: string;
  poId: string;
  vendor: string;
  date: string;
  amount: number;
  amountOwed?: number;
  status: string;
};

export default function PaymentsMadePage() {
  const router = useRouter();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

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
    type: "success" | "error" | "warning" | "info" = "info"
  ) {
    setAlertMessage(message);
    setAlertType(type);
    setAlertOpen(true);
  }

  useEffect(() => {
    function loadPayments() {
      const saved = localStorage.getItem("halfi_payments_made");

      try {
        setPayments(saved ? JSON.parse(saved) : []);
      } catch {
        setPayments([]);
      }
    }

    loadPayments();
    window.addEventListener("pageshow", loadPayments);

    return () => {
      window.removeEventListener("pageshow", loadPayments);
    };
  }, []);

  function getAmountOwed(payment: Payment) {
    if (typeof payment.amountOwed === "number") {
      return payment.amountOwed;
    }

    const savedBills = localStorage.getItem("halfi_bills") ?? "[]";
    const bills = JSON.parse(savedBills);
    const bill = bills.find((b: any) => b.id === payment.billId);

    if (!bill) return 0;

    const total = bill.items.reduce(
      (sum: number, item: any) =>
        sum + Number(item.quantity || 0) * Number(item.unitCost || 0),
      0
    );

    return Math.max(total - Number(bill.amountPaid || 0), 0);
  }

  function getBillTotal(bill: any) {
    return (bill.items || []).reduce(
      (sum: number, item: any) =>
        sum + Number(item.quantity || 0) * Number(item.unitCost || 0),
      0
    );
  }

  function goToPO(payment: Payment) {
    localStorage.setItem("halfi_open_po_id", payment.poId);
    router.push("/purchase-orders");
  }

  function goToBill(payment: Payment) {
    localStorage.setItem("halfi_open_bill_id", payment.billId);
    router.push("/bills");
  }

  function deletePayment(payment: Payment) {
    setConfirmMessage(
      "Delete this payment? This will update the related bill and purchase order balance/status."
    );

    setConfirmAction(() => () => {
      actuallyDeletePayment(payment);
    });

    setConfirmOpen(true);
  }

  function actuallyDeletePayment(payment: Payment) {
    const updatedPayments = payments.filter((p) => p.id !== payment.id);

    localStorage.setItem(
      "halfi_payments_made",
      JSON.stringify(updatedPayments)
    );

    setPayments(updatedPayments);

    const savedBills = localStorage.getItem("halfi_bills") ?? "[]";
    const bills = JSON.parse(savedBills);

    const updatedBills = bills.map((bill: any) => {
      if (bill.id !== payment.billId) return bill;

      const newPaid = Math.max(
        Number(bill.amountPaid || 0) - Number(payment.amount || 0),
        0
      );

      const total = getBillTotal(bill);

      const newStatus =
        newPaid <= 0 ? "Open" : newPaid >= total ? "Paid" : "Partially Paid";

      return {
        ...bill,
        amountPaid: newPaid,
        status: newStatus,
      };
    });

    localStorage.setItem("halfi_bills", JSON.stringify(updatedBills));

    const savedPOs = localStorage.getItem("halfi_purchase_orders") ?? "[]";
    const pos = JSON.parse(savedPOs);

    const updatedPOs = pos.map((po: any) => {
      if (po.id !== payment.poId) return po;

      const newPaid = Math.max(
        Number(po.amountPaid || 0) - Number(payment.amount || 0),
        0
      );

      const poTotal = (po.items || []).reduce(
        (sum: number, item: any) =>
          sum + Number(item.quantity || 0) * Number(item.unitCost || 0),
        0
      );

      const newStatus =
        newPaid <= 0
          ? "Issued"
          : newPaid >= poTotal
          ? "Paid"
          : "Partially Paid";

      return {
        ...po,
        amountPaid: newPaid,
        status: newStatus,
        payments: (po.payments || []).filter(
          (poPayment: any) => poPayment.id !== payment.id
        ),
      };
    });

    localStorage.setItem("halfi_purchase_orders", JSON.stringify(updatedPOs));

    setSelectedPayment(null);

    showAlert("Payment deleted. Bill and PO updated.", "warning");
  }

  const totalPaid = payments.reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0
  );

  const totalOwed = payments.reduce(
    (sum, payment) => sum + getAmountOwed(payment),
    0
  );

  return (
    <main className="min-h-screen bg-zinc-100 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-3xl bg-black p-8 text-white">
          <h1 className="text-4xl font-black tracking-widest text-amber-300">
            PAYMENTS MADE
          </h1>
          <p className="mt-2 text-zinc-300">
            Supplier payment history from bills.
          </p>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm text-zinc-500">Total Payments</p>
            <p className="mt-2 text-3xl font-black">{payments.length}</p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm text-zinc-500">Total Paid</p>
            <p className="mt-2 text-3xl font-black">
              ${totalPaid.toLocaleString()}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm text-zinc-500">Total Still Owed</p>
            <p className="mt-2 text-3xl font-black">
              ${totalOwed.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-2xl font-bold">Payment History</h2>

          {payments.length === 0 ? (
            <p className="text-zinc-500">No payments made yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead className="bg-zinc-100 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="p-4">Payment ID</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Vendor</th>
                    <th className="p-4">PO</th>
                    <th className="p-4">Bill</th>
                    <th className="p-4">Amount Paid</th>
                    <th className="p-4">Amount Owed</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {payments.map((payment) => (
                    <tr
                      key={payment.id}
                      onClick={() => setSelectedPayment(payment)}
                      className="cursor-pointer border-t transition hover:bg-zinc-50"
                    >
                      <td className="p-4 font-bold">{payment.id}</td>
                      <td className="p-4">{payment.date}</td>
                      <td className="p-4">{payment.vendor}</td>
                      <td className="p-4 font-bold">{payment.poId}</td>
                      <td className="p-4 font-bold">{payment.billId}</td>
                      <td className="p-4 font-black">
                        ${Number(payment.amount || 0).toLocaleString()}
                      </td>
                      <td className="p-4 font-black">
                        ${getAmountOwed(payment).toLocaleString()}
                      </td>
                      <td className="p-4">
                        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold">
                          {payment.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deletePayment(payment);
                          }}
                          className="rounded-xl bg-red-600 px-4 py-2 font-bold text-white"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selectedPayment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
            <div className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl">
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <h2 className="text-3xl font-black">{selectedPayment.id}</h2>
                  <p className="mt-1 text-zinc-500">{selectedPayment.vendor}</p>
                </div>

                <button
                  type="button"
                  data-readonly-allow="true"
                  onClick={() => setSelectedPayment(null)}
                  className="rounded-xl bg-zinc-100 px-4 py-2 font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="mb-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-zinc-100 p-4">
                  <p className="text-xs uppercase text-zinc-500">Date</p>
                  <p className="mt-1 text-lg font-black">
                    {selectedPayment.date}
                  </p>
                </div>

                <div className="rounded-2xl bg-zinc-100 p-4">
                  <p className="text-xs uppercase text-zinc-500">Amount Paid</p>
                  <p className="mt-1 text-lg font-black">
                    ${Number(selectedPayment.amount || 0).toLocaleString()}
                  </p>
                </div>

                <div className="rounded-2xl bg-zinc-100 p-4">
                  <p className="text-xs uppercase text-zinc-500">Amount Owed</p>
                  <p className="mt-1 text-lg font-black">
                    ${getAmountOwed(selectedPayment).toLocaleString()}
                  </p>
                </div>

                <div className="rounded-2xl bg-zinc-100 p-4">
                  <p className="text-xs uppercase text-zinc-500">Status</p>
                  <p className="mt-1 text-lg font-black">
                    {selectedPayment.status}
                  </p>
                </div>

                <div className="rounded-2xl bg-zinc-100 p-4">
                  <p className="text-xs uppercase text-zinc-500">PO Number</p>
                  <p className="mt-1 text-lg font-black">
                    {selectedPayment.poId}
                  </p>
                </div>

                <div className="rounded-2xl bg-zinc-100 p-4">
                  <p className="text-xs uppercase text-zinc-500">Bill Number</p>
                  <p className="mt-1 text-lg font-black">
                    {selectedPayment.billId}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  data-readonly-allow="true"
                  onClick={() => goToPO(selectedPayment)}
                  className="rounded-xl bg-black px-5 py-3 font-bold text-amber-300"
                >
                  Open Purchase Order
                </button>

                <button
                  type="button"
                  data-readonly-allow="true"
                  onClick={() => goToBill(selectedPayment)}
                  className="rounded-xl bg-amber-400 px-5 py-3 font-bold text-black"
                >
                  Open Bill
                </button>

                <button
                  type="button"
                  onClick={() => deletePayment(selectedPayment)}
                  className="rounded-xl bg-red-600 px-5 py-3 font-bold text-white"
                >
                  Delete Payment
                </button>

                <button
                  type="button"
                  data-readonly-allow="true"
                  onClick={() => setSelectedPayment(null)}
                  className="rounded-xl border px-5 py-3 font-bold"
                >
                  Close
                </button>
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