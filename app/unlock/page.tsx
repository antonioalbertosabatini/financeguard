"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { UnlockForm } from "@/components/auth/unlock-form";
import { FullScreenLoader } from "@/components/providers/full-screen-loader";
import { useDataStore } from "@/lib/storage/data-store";

export default function UnlockPage() {
  const { status } = useDataStore();
  const router = useRouter();

  useEffect(() => {
    if (status === "unlocked") router.replace("/");
    else if (status === "needs-setup") router.replace("/setup");
  }, [status, router]);

  if (status !== "locked") return <FullScreenLoader />;

  return (
    <AuthShell
      title="FinanceGuard"
      description="Inserisci la password per sbloccare i tuoi dati."
    >
      <UnlockForm />
    </AuthShell>
  );
}
