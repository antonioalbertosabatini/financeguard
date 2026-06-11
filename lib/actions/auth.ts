"use server";

import { redirect } from "next/navigation";
import { initVault, vaultExists, verifyPassword } from "@/lib/crypto/vault";
import { lockSession, setSessionKey } from "@/lib/crypto/session";

const MIN_PASSWORD_LENGTH = 8;

export type AuthResult = { error: string } | undefined;

export async function setupPassword(
  password: string,
  confirm: string
): Promise<AuthResult> {
  if (await vaultExists()) {
    redirect("/unlock");
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      error: `La password deve avere almeno ${MIN_PASSWORD_LENGTH} caratteri.`,
    };
  }
  if (password !== confirm) {
    return { error: "Le password non coincidono." };
  }

  const key = await initVault(password);
  setSessionKey(key);
  redirect("/");
}

export async function unlockApp(password: string): Promise<AuthResult> {
  if (!(await vaultExists())) {
    redirect("/setup");
  }

  const key = await verifyPassword(password);
  if (!key) {
    return { error: "Password errata." };
  }

  setSessionKey(key);
  redirect("/");
}

export async function lockApp(): Promise<void> {
  lockSession();
  redirect("/unlock");
}
