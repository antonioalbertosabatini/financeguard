import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { StoreBootstrap } from "@/components/providers/store-bootstrap";
import { I18nProvider } from "@/providers/i18n-provider";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "FinanceGuard",
  description: "Local personal finance management",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "FinanceGuard",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f6fb" },
    { media: "(prefers-color-scheme: dark)", color: "#16151d" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className={`${dmSans.variable} h-full`}>
      <body className="min-h-full flex flex-col font-sans antialiased">
        <I18nProvider>
          <StoreBootstrap />
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
