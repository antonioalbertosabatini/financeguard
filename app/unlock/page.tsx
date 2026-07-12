"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { UnlockForm } from "@/components/auth/unlock-form";
import { FullScreenLoader } from "@/components/providers/full-screen-loader";
import { useDataStore } from "@/lib/storage/data-store";
import { useI18n } from "@/providers/i18n-provider";

export default function UnlockPage() {
  const { t } = useI18n();
  const { status } = useDataStore();
  const router = useRouter();

  useEffect(() => {
    if (status === "unlocked") router.replace("/");
    else if (status === "needs-setup") router.replace("/setup");
  }, [status, router]);

  if (status !== "locked") return <FullScreenLoader />;

  return (
    <AuthShell
      title={t("auth.unlockTitle")}
      description={t("auth.unlockDescription")}
    >
      <UnlockForm />
    </AuthShell>
  );
}
