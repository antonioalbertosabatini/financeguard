/**
 * Sync cloud zero-knowledge (opt-in).
 *
 * Sul cloud finisce SOLO il bundle cifrato: Supabase non possiede mai la chiave.
 * Il merge avviene client-side (vedi sync-orchestrator e merge-datasets).
 */
import { MIN_PASSWORD_LENGTH } from "@/lib/constants";
import { AppError } from "@/lib/i18n/app-error";
import { ConflictError } from "@/lib/storage/bundle";
import { getLocalDeviceId } from "@/lib/storage/local-store";
import { deriveAuthHash, normalizeEmail } from "@/lib/sync/auth-derive";
import {
  acquireSessionLock,
  releaseSessionLock,
  SessionLockedError,
} from "@/lib/sync/session-lock";
import { getSupabase, isCloudConfigured } from "@/lib/sync/supabase-client";

export { ConflictError, SessionLockedError, isCloudConfigured };

function assertValidPassword(password: string): void {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new AppError("validation.passwordMinLength", {
      minLength: MIN_PASSWORD_LENGTH,
    });
  }
}

const BUCKET = "vaults";
const OBJECT = "bundle.fgv";

function bundlePath(userId: string): string {
  return `${userId}/${OBJECT}`;
}

// --- Auth --------------------------------------------------------------------

export async function signUpCloud(
  email: string,
  password: string
): Promise<void> {
  assertValidPassword(password);
  const supabase = getSupabase();
  const authHash = deriveAuthHash(email, password);
  const { error } = await supabase.auth.signUp({
    email: normalizeEmail(email),
    password: authHash,
  });
  if (error) throw new Error(error.message);
}

export async function signInCloud(
  email: string,
  password: string
): Promise<void> {
  assertValidPassword(password);
  const supabase = getSupabase();
  const authHash = deriveAuthHash(email, password);
  const { error } = await supabase.auth.signInWithPassword({
    email: normalizeEmail(email),
    password: authHash,
  });
  if (error) throw new Error(error.message);

  await acquireSessionLock();
}

export async function signOutCloud(): Promise<void> {
  await releaseSessionLock().catch(() => {});
  await getSupabase().auth.signOut();
}

export async function updateCloudAuth(
  email: string,
  newPassword: string
): Promise<void> {
  assertValidPassword(newPassword);
  const supabase = getSupabase();
  const authHash = deriveAuthHash(email, newPassword);
  const { error } = await supabase.auth.updateUser({ password: authHash });
  if (error) throw new Error(error.message);
}

async function requireUserId(): Promise<string> {
  const { data } = await getSupabase().auth.getUser();
  if (!data.user) throw new AppError("errors.noCloudSession");
  return data.user.id;
}

export async function hasCloudSession(): Promise<boolean> {
  const { data } = await getSupabase().auth.getSession();
  return Boolean(data.session);
}

export async function getCloudUserEmail(): Promise<string | null> {
  const { data, error } = await getSupabase().auth.getUser();
  if (error || !data.user) return null;
  return data.user.email ?? null;
}

// --- Metadati bundle ---------------------------------------------------------

export async function getRemoteRevision(): Promise<number | null> {
  const userId = await requireUserId();
  const { data, error } = await getSupabase()
    .from("vault_meta")
    .select("revision")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? (data.revision as number) : null;
}

async function setRemoteRevision(
  userId: string,
  revision: number
): Promise<void> {
  const deviceId = await getLocalDeviceId();
  const { error } = await getSupabase().from("vault_meta").upsert({
    user_id: userId,
    revision,
    device_id: deviceId,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

export async function downloadRemoteBundle(): Promise<string | null> {
  const userId = await requireUserId();
  const remoteRevision = await getRemoteRevision();
  if (remoteRevision === null) return null;

  const { data, error } = await getSupabase()
    .storage.from(BUCKET)
    .download(bundlePath(userId));
  if (error) throw new Error(error.message);
  return data.text();
}

export async function uploadBundle(
  bundleText: string,
  revision: number
): Promise<void> {
  const userId = await requireUserId();
  const blob = new Blob([bundleText], { type: "application/json" });
  const { error } = await getSupabase()
    .storage.from(BUCKET)
    .upload(bundlePath(userId), blob, {
      upsert: true,
      contentType: "application/json",
    });
  if (error) throw new Error(error.message);
  await setRemoteRevision(userId, revision);
}
