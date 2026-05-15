"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, PackageCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("admin@halfi.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function login() {
    setError("");

    if (!email.trim()) {
      setError("Enter your email.");
      return;
    }

    if (!password.trim()) {
      setError("Enter your password.");
      return;
    }

    if (password !== "1234") {
      setError("Wrong password. Try 1234 for now.");
      return;
    }

    localStorage.setItem("halfi_logged_in", "true");
    localStorage.setItem("halfi_user_email", email);

    router.push("/");
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="grid min-h-screen lg:grid-cols-2">
        <section className="relative hidden overflow-hidden bg-black p-12 lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(250,204,21,0.24),transparent_35%),radial-gradient(circle_at_80%_70%,rgba(250,204,21,0.14),transparent_35%)]" />

          <div className="relative z-10">
            <h1 className="text-6xl font-black tracking-[0.28em] text-amber-300">
              HALFI
            </h1>
            <p className="mt-4 text-sm uppercase tracking-[0.45em] text-zinc-400">
              Inventory System
            </p>
          </div>

          <div className="relative z-10 max-w-xl">
            <div className="mb-8 inline-flex rounded-3xl bg-amber-300 p-5 text-black shadow-2xl shadow-amber-300/20">
              <PackageCheck size={44} />
            </div>

            <h2 className="text-5xl font-black leading-tight">
              Inventory, sales, purchasing, and profit in one place.
            </h2>

            <p className="mt-6 text-lg leading-8 text-zinc-300">
              Track stock, purchase orders, vendor bills, customer sales,
              payments, and financial reports from one clean dashboard.
            </p>
          </div>

          <div className="relative z-10 grid grid-cols-3 gap-4">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-2xl font-black text-amber-300">Stock</p>
              <p className="mt-1 text-sm text-zinc-400">Live inventory</p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-2xl font-black text-amber-300">POs</p>
              <p className="mt-1 text-sm text-zinc-400">Purchasing</p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-2xl font-black text-amber-300">Profit</p>
              <p className="mt-1 text-sm text-zinc-400">Reports</p>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <div className="mb-10 text-center lg:hidden">
              <h1 className="text-5xl font-black tracking-[0.25em] text-amber-300">
                HALFI
              </h1>
              <p className="mt-3 text-xs uppercase tracking-[0.35em] text-zinc-500">
                Inventory System
              </p>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white p-8 text-black shadow-2xl">
              <div className="mb-8">
                <p className="text-sm font-black uppercase tracking-[0.3em] text-amber-500">
                  Welcome Back
                </p>
                <h2 className="mt-2 text-4xl font-black">Sign in</h2>
                <p className="mt-2 text-zinc-500">
                  Enter your login to open the Halfi dashboard.
                </p>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="text-sm font-bold">Email</label>
                  <div className="mt-2 flex items-center gap-3 rounded-2xl border px-4 py-3 focus-within:border-black">
                    <Mail size={20} className="text-zinc-400" />
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@halfi.com"
                      className="w-full bg-transparent outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-bold">Password</label>
                  <div className="mt-2 flex items-center gap-3 rounded-2xl border px-4 py-3 focus-within:border-black">
                    <Lock size={20} className="text-zinc-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") login();
                      }}
                      placeholder="Password"
                      className="w-full bg-transparent outline-none"
                    />
                  </div>
                </div>

                {error && (
                  <p className="rounded-2xl bg-red-100 p-3 font-bold text-red-700">
                    {error}
                  </p>
                )}

                <button
                  type="button"
                  onClick={login}
                  className="w-full rounded-2xl bg-black px-5 py-4 text-lg font-black text-amber-300 transition hover:scale-[1.01]"
                >
                  Login
                </button>

                <div className="rounded-2xl bg-zinc-100 p-4 text-sm text-zinc-600">
                  Temporary local password: <b>1234</b>
                </div>
              </div>
            </div>

            <p className="mt-6 text-center text-sm text-zinc-500">
              Local demo login using browser storage.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
