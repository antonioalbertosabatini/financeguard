import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { isUnlocked } from "@/lib/crypto/session";
import { vaultExists } from "@/lib/crypto/vault";

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (!(await vaultExists())) {
    redirect("/setup");
  }
  if (!isUnlocked()) {
    redirect("/unlock");
  }

  return <AppShell>{children}</AppShell>;
}
