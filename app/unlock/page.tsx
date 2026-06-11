import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { UnlockForm } from "@/components/auth/unlock-form";
import { vaultExists } from "@/lib/crypto/vault";

export const dynamic = "force-dynamic";

export default async function UnlockPage() {
  if (!(await vaultExists())) {
    redirect("/setup");
  }

  return (
    <AuthShell
      title="FinanceGuard"
      description="Inserisci la password per sbloccare i tuoi dati."
    >
      <UnlockForm />
    </AuthShell>
  );
}
