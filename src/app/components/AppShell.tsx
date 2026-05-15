"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import AuthGate from "./AuthGate";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <AuthGate>
      <div className="flex min-h-screen bg-zinc-100">
        <Sidebar />

        <main className="flex-1 p-6 lg:ml-80 lg:p-10">
          {children}
        </main>
      </div>
    </AuthGate>
  );
}