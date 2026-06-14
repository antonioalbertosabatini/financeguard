import type { MetadataRoute } from "next";

// Manifest PWA: rende l'app installabile su desktop e mobile (FASE 2).
// Per un'esperienza completa serve anche un service worker (vedi README).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FinanceGuard",
    short_name: "FinanceGuard",
    description: "Gestione finanze personali, locale e cifrata.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0b0c",
    theme_color: "#0b0b0c",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
