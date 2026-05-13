"use client";

import { useEffect, useState } from "react";

type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  notes: string;
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    loadCustomers();
    window.addEventListener("pageshow", loadCustomers);

    return () => {
      window.removeEventListener("pageshow", loadCustomers);
    };
  }, []);

  function loadCustomers() {
    const saved = localStorage.getItem("halfi_customers");

    try {
      setCustomers(saved ? JSON.parse(saved) : []);
    } catch {
      setCustomers([]);
    }
  }

  function saveCustomers(updated: Customer[]) {
    setCustomers(updated);
    localStorage.setItem("halfi_customers", JSON.stringify(updated));
  }

  function resetForm() {
    setName("");
    setEmail("");
    setPhone("");
    setWhatsapp("");
    setAddress("");
    setNotes("");
    setSelectedCustomer(null);
  }

  function saveCustomer() {
    if (!name.trim()) {
      alert("Customer name is required.");
      return;
    }

    if (selectedCustomer) {
      const updated = customers.map((customer) =>
        customer.id === selectedCustomer.id
          ? {
              ...customer,
              name,
              email,
              phone,
              whatsapp,
              address,
              notes,
            }
          : customer
      );

      saveCustomers(updated);
      resetForm();
      alert("Customer updated.");
      return;
    }

    const newCustomer: Customer = {
      id: `CUS-${Date.now()}`,
      name,
      email,
      phone,
      whatsapp,
      address,
      notes,
    };

    saveCustomers([newCustomer, ...customers]);
    resetForm();
    alert("Customer saved.");
  }

  function editCustomer(customer: Customer) {
    setSelectedCustomer(customer);
    setName(customer.name || "");
    setEmail(customer.email || "");
    setPhone(customer.phone || "");
    setWhatsapp(customer.whatsapp || "");
    setAddress(customer.address || "");
    setNotes(customer.notes || "");
  }

  function deleteCustomer(id: string) {
    const confirmDelete = window.confirm("Delete this customer?");

    if (!confirmDelete) return;

    saveCustomers(customers.filter((customer) => customer.id !== id));

    if (selectedCustomer?.id === id) {
      resetForm();
    }

    alert("Customer deleted.");
  }

  return (
    <main className="min-h-screen bg-zinc-100 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-3xl bg-black p-8 text-white">
          <h1 className="text-4xl font-black tracking-widest text-amber-300">
            CUSTOMERS
          </h1>
          <p className="mt-2 text-zinc-300">
            Save customer details for sales orders.
          </p>
        </div>

        <div className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-2xl font-bold">
            {selectedCustomer ? "Edit Customer" : "Create Customer"}
          </h2>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-bold">Customer Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Customer name"
                className="mt-2 w-full rounded-xl border px-4 py-3"
              />
            </div>

            <div>
              <label className="text-sm font-bold">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@email.com"
                className="mt-2 w-full rounded-xl border px-4 py-3"
              />
            </div>

            <div>
              <label className="text-sm font-bold">Phone</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone number"
                className="mt-2 w-full rounded-xl border px-4 py-3"
              />
            </div>

            <div>
              <label className="text-sm font-bold">WhatsApp</label>
              <input
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="WhatsApp number"
                className="mt-2 w-full rounded-xl border px-4 py-3"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-bold">Address</label>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Address"
                className="mt-2 w-full rounded-xl border px-4 py-3"
              />
            </div>

            <div className="md:col-span-3">
              <label className="text-sm font-bold">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes"
                className="mt-2 w-full rounded-xl border px-4 py-3"
                rows={3}
              />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={saveCustomer}
              className="rounded-xl bg-black px-5 py-3 font-bold text-amber-300"
            >
              {selectedCustomer ? "Update Customer" : "Save Customer"}
            </button>

            {selectedCustomer && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border px-5 py-3 font-bold"
              >
                Cancel Edit
              </button>
            )}
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-2xl font-bold">Saved Customers</h2>

          {customers.length === 0 ? (
            <p className="text-zinc-500">No customers saved yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className="bg-zinc-100 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Phone</th>
                    <th className="p-4">WhatsApp</th>
                    <th className="p-4">Address</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.id} className="border-t">
                      <td className="p-4 font-black">{customer.name}</td>
                      <td className="p-4">{customer.email || "-"}</td>
                      <td className="p-4">{customer.phone || "-"}</td>
                      <td className="p-4">{customer.whatsapp || "-"}</td>
                      <td className="p-4">{customer.address || "-"}</td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => editCustomer(customer)}
                            className="rounded-xl bg-amber-400 px-4 py-2 font-bold text-black"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteCustomer(customer.id)}
                            className="rounded-xl bg-red-600 px-4 py-2 font-bold text-white"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
