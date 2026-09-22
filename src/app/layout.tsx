import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Bluecroft Farming — Crab Inventory",
  description: "Crab hardening inventory, data entry, dashboard and reports for Bluecroft Farming.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full font-sans">
        <div className="flex min-h-screen flex-col lg:flex-row">
          <Sidebar />
          <div className="min-w-0 flex-1">
            <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
