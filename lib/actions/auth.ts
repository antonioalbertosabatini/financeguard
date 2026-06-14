"use server";

import { redirect } from "next/navigation";
import {
  createVault,
  initVault,
  reKeyAllData,
  vaultExists,
  verifyPassword,
  writeVaultFile,
} from "@/lib/crypto/vault";
import { lockSession, setSessionKey } from "@/lib/crypto/session";
import { markDataWritten, releaseLock } from "@/lib/db/sync-guard";
import { MIN_PASSWORD_LENGTH } from "@/lib/constants";

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

export async function changePassword(
  oldPassword: string,
  newPassword: string,
  confirm: string
): Promise<AuthResult> {
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return {
      error: `La nuova password deve avere almeno ${MIN_PASSWORD_LENGTH} caratteri.`,
    };
  }
  if (newPassword !== confirm) {
    return { error: "Le password non coincidono." };
  }

  const oldKey = await verifyPassword(oldPassword);
  if (!oldKey) {
    return { error: "Vecchia password errata." };
  }

  const { vault, key: newKey } = createVault(newPassword);
  await reKeyAllData(oldKey, newKey);
  await writeVaultFile(vault);
  await markDataWritten();
  setSessionKey(newKey);
}

export async function lockApp(): Promise<void> {
  await releaseLock();
  lockSession();
  redirect("/unlock");
}
