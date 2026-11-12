import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { StoreBootstrap } from "@/components/providers/store-bootstrap";
import { I18nProvider } from "@/providers/i18n-provider";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/providers/theme-provider";
import { MotionProvider } from "@/providers/motion-provider";
import { THEME_BACKGROUND_HEX, THEME_INIT_SCRIPT } from "@/lib/theme";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  // Variable font: enables intermediate weights (550, 650) used by the design system.
  axes: ["opsz"],
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
    { media: "(prefers-color-scheme: light)", color: THEME_BACKGROUND_HEX.light },
    { media: "(prefers-color-scheme: dark)", color: THEME_BACKGROUND_HEX.dark },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="it"
      className={`${dmSans.variable} h-full`}
      // The theme class is set before hydration by THEME_INIT_SCRIPT.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col font-sans antialiased">
        <ThemeProvider>
          <MotionProvider>
            <I18nProvider>
              <StoreBootstrap />
              {children}
              <Toaster richColors closeButton />
            </I18nProvider>
          </MotionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
