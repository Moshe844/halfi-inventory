"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type UserRole = "Admin" | "Read / Write" | "Read Only";

type AppUser = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  active: boolean;
};

const ADMIN_EMAIL = "arye6700@gmail.com";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function ensureAdminUser() {
  const saved = localStorage.getItem("halfi_users");
  const users: AppUser[] = saved ? JSON.parse(saved) : [];

  const hasAdmin = users.some(
    (user) => normalizeEmail(user.email) === ADMIN_EMAIL
  );

  if (!hasAdmin) {
    const updatedUsers: AppUser[] = [
      {
        id: `USER-${Date.now()}`,
        name: "Admin",
        email: ADMIN_EMAIL,
        password: "1234",
        role: "Admin",
        active: true,
      },
      ...users,
    ];

    localStorage.setItem("halfi_users", JSON.stringify(updatedUsers));
  }
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    ensureAdminUser();

    if (pathname === "/login") {
      setReady(true);
      return;
    }

    const loggedIn = localStorage.getItem("halfi_logged_in") === "true";
    const email = localStorage.getItem("halfi_user_email") || "";
    const users: AppUser[] = JSON.parse(localStorage.getItem("halfi_users") || "[]");

    const user = users.find(
      (savedUser) => normalizeEmail(savedUser.email) === normalizeEmail(email)
    );

    if (!loggedIn || !user || !user.active) {
      localStorage.removeItem("halfi_logged_in");
      router.replace("/login");
      return;
    }

    localStorage.setItem("halfi_user_role", user.role);

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
