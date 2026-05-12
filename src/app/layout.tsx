import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "./components/Sidebar";

export const metadata: Metadata = {
  title: "Halfi Inventory",
  description: "Custom inventory system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen bg-zinc-100">
          <Sidebar />

          <main className="flex-1 p-6 lg:ml-80 lg:p-10">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}