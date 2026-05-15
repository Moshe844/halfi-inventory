"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (pathname === "/login") {
      setReady(true);
      return;
    }

    const loggedIn = localStorage.getItem("halfi_logged_in") === "true";

    if (!loggedIn) {
      router.replace("/login");
      return;
    }

    setReady(true);
  }, [pathname, router]);

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-amber-300">
        <div className="text-center">
          <h1 className="text-5xl font-black tracking-[0.25em]">HALFI</h1>
          <p className="mt-4 text-sm uppercase tracking-[0.35em] text-zinc-400">
            Loading
          </p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
