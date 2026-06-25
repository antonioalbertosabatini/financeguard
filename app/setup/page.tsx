"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { SetupForm } from "@/components/auth/setup-form";
import { FullScreenLoader } from "@/components/providers/full-screen-loader";
import { useDataStore } from "@/lib/storage/data-store";

export default function SetupPage() {
  const { status } = useDataStore();
  const router = useRouter();

  useEffect(() => {
    if (status === "unlocked") router.replace("/");
    else if (status === "locked") router.replace("/unlock");
  }, [status, router]);

  if (status !== "needs-setup") return <FullScreenLoader />;

  return (
    <AuthShell
      title="Benvenuto in FinanceGuard"
      description="Imposta una password per proteggere i tuoi dati con la crittografia."
    >
      <SetupForm />
    </AuthShell>
  );
}
