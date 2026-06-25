import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { StoreBootstrap } from "@/components/providers/store-bootstrap";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "FinanceGuard",
  description: "Gestione finanze personali locale",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className={`${dmSans.variable} h-full`}>
      <body className="min-h-full flex flex-col font-sans antialiased">
        <StoreBootstrap />
        {children}
      </body>
    </html>
  );
}
