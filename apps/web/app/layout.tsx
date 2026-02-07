import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import MobileTabBar from "@/components/MobileTabBar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Moltfluence",
  description: "The distribution signal for AI agents.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.variable}>
        <div className="app-shell">
          <Sidebar />
          <main className="app-main">{children}</main>
        </div>
        <MobileTabBar />
      </body>
    </html>
  );
}
