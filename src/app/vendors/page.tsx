"use client";

import { useEffect, useState } from "react";

type Vendor = {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  address?: string;
  contactName?: string;
};

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [address, setAddress] = useState("");
  const [contactName, setContactName] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("halfi_vendors");
    setVendors(saved ? JSON.parse(saved) : []);
  }, []);

  function saveVendors(updated: Vendor[]) {
    setVendors(updated);
    localStorage.setItem("halfi_vendors", JSON.stringify(updated));
  }

  function createVendor() {
    if (!name.trim()) {
      alert("Vendor name is required.");
      return;
    }

    const newVendor: Vendor = {
      id: `VEN-${Date.now()}`,
      name,
      email,
      whatsapp,
      address,
      contactName,
    };

    saveVendors([newVendor, ...vendors]);

    setName("");
    setEmail("");
    setWhatsapp("");
    setAddress("");
    setContactName("");

    alert("Vendor saved.");
  }

  function deleteVendor(id: string) {
    if (!confirm("Delete this vendor?")) return;
    saveVendors(vendors.filter((v) => v.id !== id));
  }

  return (
    <main className="min-h-screen bg-zinc-100 p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 rounded-3xl bg-black p-8 text-white">
          <h1 className="text-4xl font-black tracking-widest text-amber-300">
            VENDORS
          </h1>
          <p className="mt-2 text-zinc-300">
            Save vendor contact info for purchase orders.
          </p>
        </div>

        <div className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-2xl font-bold">Add Vendor</h2>

          <div className="grid gap-4 md:grid-cols-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Vendor name"
              className="rounded-xl border px-4 py-3"
            />

            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Vendor email"
              className="rounded-xl border px-4 py-3"
            />

            <input
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="WhatsApp number"
              className="rounded-xl border px-4 py-3"
            />

            <input
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Contact person"
              className="rounded-xl border px-4 py-3"
            />

            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Address"
              className="rounded-xl border px-4 py-3 md:col-span-2"
            />
          </div>

          <button
            type="button"
            onClick={createVendor}
            className="mt-5 rounded-xl bg-black px-5 py-3 font-bold text-amber-300"
          >
            Save Vendor
          </button>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-2xl font-bold">Saved Vendors</h2>

          {vendors.length === 0 ? (
            <p className="text-zinc-500">No vendors saved yet.</p>
          ) : (
            <div className="space-y-3">
              {vendors.map((vendor) => (
                <div
                  key={vendor.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-5"
                >
                  <div>
                    <h3 className="text-xl font-black">{vendor.name}</h3>
                    <p className="text-sm text-zinc-500">
                      {vendor.email || "No email"} ·{" "}
                      {vendor.whatsapp || "No WhatsApp"}
                    </p>
                    {vendor.contactName && (
                      <p className="text-sm text-zinc-500">
                        Contact: {vendor.contactName}
                      </p>
                    )}
                    {vendor.address && (
                      <p className="text-sm text-zinc-500">{vendor.address}</p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => deleteVendor(vendor.id)}
                    className="rounded-xl bg-red-600 px-4 py-2 font-bold text-white"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}