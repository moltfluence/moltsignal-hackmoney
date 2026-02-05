import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MoltSignal HackMoney",
  description: "Agent reputation and settlement on Arc testnet + Yellow micro-rewards",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
