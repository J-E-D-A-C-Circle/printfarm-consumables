import type { Metadata } from "next";
import "./globals.css";
import { ReactNode } from "react";
import { GooeyToaster } from "@/components/ui/gooey-toast";

export const metadata: Metadata = {
  title: "DVLA Consumables Management",
  description: "Internal Consumables Management System for the Driver and Vehicle Licensing Authority (DVLA), Ghana.",
  icons: {
    icon: [{ url: "/oop.png?v=2", type: "image/png" }],
    shortcut: ["/oop.png?v=2"],
    apple: [{ url: "/oop.png?v=2", type: "image/png" }],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="icon" href="/oop.png?v=2" type="image/png" />
        <link rel="shortcut icon" href="/oop.png?v=2" type="image/png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <GooeyToaster />
      </body>
    </html>
  );
}
