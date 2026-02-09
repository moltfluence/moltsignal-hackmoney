import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

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
    <html className="dark" lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background-dark text-white antialiased overflow-hidden">
        <div className="flex h-screen w-full">
          <Sidebar />
          <main className="flex-1 ml-[88px] h-full overflow-y-auto hide-scrollbar bg-background-dark p-6 md:p-10 lg:p-12">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
