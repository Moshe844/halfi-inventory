"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import AuthGate from "./AuthGate";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [role, setRole] = useState("");

  const isLoginPage = pathname === "/login";
  const isReadOnly = !isLoginPage && role === "Read Only";

  useEffect(() => {
    setRole(localStorage.getItem("halfi_user_role") || "");
  }, [pathname]);

  useEffect(() => {
    if (isLoginPage) return;
    if (!isReadOnly) return;

    function blockReadOnlyActions(e: Event) {
      const target = e.target as HTMLElement;

      const allowed = target.closest(
        "a, [data-readonly-allow='true'], button[data-readonly-allow='true']"
      );

      if (allowed) return;

      const writeButton = target.closest("button");
      const formField = target.closest(
        "input, textarea, select, [contenteditable='true']"
      );

      if (!writeButton && !formField) return;

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      alert(
        "Read Only users cannot create, edit, delete, save, receive, import, or update anything."
      );
    }

    document.addEventListener("click", blockReadOnlyActions, true);
    document.addEventListener("submit", blockReadOnlyActions, true);
    document.addEventListener("change", blockReadOnlyActions, true);
    document.addEventListener("input", blockReadOnlyActions, true);

    return () => {
      document.removeEventListener("click", blockReadOnlyActions, true);
      document.removeEventListener("submit", blockReadOnlyActions, true);
      document.removeEventListener("change", blockReadOnlyActions, true);
      document.removeEventListener("input", blockReadOnlyActions, true);
    };
  }, [isReadOnly, isLoginPage]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <AuthGate>
      <div className="flex min-h-screen bg-zinc-100">
        <Sidebar />

        <main className="flex-1 p-6 lg:ml-80 lg:p-10">
          {isReadOnly && (
            <div className="mb-5 rounded-2xl bg-amber-100 p-4 font-bold text-amber-800">
              Read Only Mode: you can view and move around, but cannot create,
              edit, delete, save, receive, import, or update anything.
            </div>
          )}

          {children}
        </main>
      </div>
    </AuthGate>
  );
}