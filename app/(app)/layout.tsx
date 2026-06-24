"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { FullScreenLoader } from "@/components/providers/full-screen-loader";
import { useDataStore } from "@/lib/storage/data-store";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { status } = useDataStore();
  const router = useRouter();

  useEffect(() => {
    if (status === "needs-setup") router.replace("/setup");
    else if (status === "locked") router.replace("/unlock");
  }, [status, router]);

  if (status !== "unlocked") return <FullScreenLoader />;
  return <AppShell>{children}</AppShell>;
}
