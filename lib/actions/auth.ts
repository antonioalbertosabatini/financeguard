/**
 * Auth lato client. Prima erano server action che derivavano la chiave, la
 * tenevano in sessione server e usavano redirect(); ora delegano allo store
 * client (lib/storage/data-store), che gestisce vault/chiave/dataset in memoria.
 * La navigazione dopo setup/unlock/lock e' gestita dalle pagine/layout in base
 * allo status dello store.
 */
import {
  changePassword as storeChangePassword,
  lockApp as storeLockApp,
  setupPassword as storeSetupPassword,
  unlockApp as storeUnlockApp,
} from "@/lib/storage/data-store";
import { releaseSessionLock } from "@/lib/sync/session-lock";

export type AuthResult = { error: string } | undefined;

export async function setupPassword(
  password: string,
  confirm: string
): Promise<AuthResult> {
  return (await storeSetupPassword(password, confirm)) ?? undefined;
}

export async function unlockApp(password: string): Promise<AuthResult> {
  return (await storeUnlockApp(password)) ?? undefined;
}

export async function changePassword(
  oldPassword: string,
  newPassword: string,
  confirm: string
): Promise<AuthResult> {
  return (await storeChangePassword(oldPassword, newPassword, confirm)) ?? undefined;
}

export async function lockApp(): Promise<void> {
  await releaseSessionLock().catch(() => {});
  storeLockApp();
}
