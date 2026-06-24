import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // App 100% client-side impacchettabile da Capacitor (webview): export statico.
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
