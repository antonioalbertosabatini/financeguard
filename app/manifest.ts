import type { MetadataRoute } from "next";

// Necessario con output: "export" per pre-renderizzare il manifest staticamente.
export const dynamic = "force-static";

// Manifest PWA: rende l'app installabile su desktop e mobile (FASE 2).
// Per un'esperienza completa serve anche un service worker (vedi README).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FinanceGuard",
    short_name: "FinanceGuard",
    description: "Local, encrypted personal finance management.",
    start_url: "/",
    display: "standalone",
    background_color: "#16151d",
    theme_color: "#16151d",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/icon-192.webp",
        sizes: "192x192",
        type: "image/webp",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512.webp",
        sizes: "512x512",
        type: "image/webp",
        purpose: "maskable",
      },
    ],
  };
}
