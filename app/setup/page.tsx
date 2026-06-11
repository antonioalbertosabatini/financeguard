import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { SetupForm } from "@/components/auth/setup-form";
import { vaultExists } from "@/lib/crypto/vault";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  if (await vaultExists()) {
    redirect("/unlock");
  }

  return (
    <AuthShell
      title="Benvenuto in FinanceGuard"
      description="Imposta una password per proteggere i tuoi dati con la crittografia."
    >
      <SetupForm />
    </AuthShell>
  );
}
