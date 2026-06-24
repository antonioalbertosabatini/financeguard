/**
 * Sync cloud zero-knowledge (opt-in).
 *
 * Sul cloud finisce SOLO il bundle cifrato (stesso formato di lib/storage/bundle):
 * Supabase non possiede mai la chiave, quindi non puo' leggere i dati. Il bundle
 * vive in Storage (bucket privato `vaults`, path `<uid>/bundle.fgv`); una riga
 * `vault_meta` tiene la revisione per la guardia anti-conflitto (last-write-wins,
 * coerente con l'uso "un dispositivo alla volta").
 *
 * Flusso tipico:
 *   signInCloud(email, pwd) -> pull() -> [data-store] unlockApp(pwd)
 *   ...mutazioni locali -> persistNow() -> push()
 *
 * NB: l'autenticazione usa `authHash` (vedi auth-derive), non la master password.
 */
import { ConflictError } from "@/lib/storage/bundle";
import { IndexedDbAdapter } from "@/lib/storage/idb-adapter";
import { getLocalDeviceId } from "@/lib/storage/local-store";
import { deriveAuthHash, normalizeEmail } from "@/lib/sync/auth-derive";
import { getSupabase } from "@/lib/sync/supabase-client";

const BUCKET = "vaults";
const OBJECT = "bundle.fgv";

function bundlePath(userId: string): string {
  return `${userId}/${OBJECT}`;
}

function revisionOf(bundleText: string): number {
  try {
    const rev = (JSON.parse(bundleText) as { revision?: number }).revision;
    return typeof rev === "number" ? rev : 0;
  } catch {
    return 0;
  }
}

// --- Auth --------------------------------------------------------------------

export async function signUpCloud(
  email: string,
  password: string
): Promise<void> {
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
  const supabase = getSupabase();
  const authHash = deriveAuthHash(email, password);
  const { error } = await supabase.auth.signInWithPassword({
    email: normalizeEmail(email),
    password: authHash,
  });
  if (error) throw new Error(error.message);
}

export async function signOutCloud(): Promise<void> {
  await getSupabase().auth.signOut();
}

/** Aggiorna la credenziale cloud dopo un cambio di master password. */
export async function updateCloudAuth(
  email: string,
  newPassword: string
): Promise<void> {
  const supabase = getSupabase();
  const authHash = deriveAuthHash(email, newPassword);
  const { error } = await supabase.auth.updateUser({ password: authHash });
  if (error) throw new Error(error.message);
}

async function requireUserId(): Promise<string> {
  const { data } = await getSupabase().auth.getUser();
  if (!data.user) throw new Error("Nessuna sessione cloud attiva.");
  return data.user.id;
}

export async function hasCloudSession(): Promise<boolean> {
  const { data } = await getSupabase().auth.getSession();
  return Boolean(data.session);
}

// --- Metadati ----------------------------------------------------------------

async function getRemoteRevision(userId: string): Promise<number | null> {
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

// --- Pull / Push -------------------------------------------------------------

/**
 * Scarica il bundle remoto (se piu' recente del locale) e lo scrive in IndexedDB,
 * pronto per essere aperto da unlockApp. Ritorna true se il locale e' stato
 * aggiornato.
 */
export async function pull(): Promise<boolean> {
  const userId = await requireUserId();
  const remoteRevision = await getRemoteRevision(userId);
  if (remoteRevision === null) return false; // niente sul cloud

  const adapter = new IndexedDbAdapter();
  const local = await adapter.load();
  const localRevision = local ? revisionOf(local) : 0;
  if (local && localRevision >= remoteRevision) return false;

  const { data, error } = await getSupabase()
    .storage.from(BUCKET)
    .download(bundlePath(userId));
  if (error) throw new Error(error.message);

  await adapter.save(await data.text());
  return true;
}

/**
 * Carica il bundle locale sul cloud. Se la revisione remota e' piu' avanti,
 * lancia ConflictError (un altro dispositivo ha scritto): la UI deve invitare a
 * fare pull prima. Carica prima il blob, poi aggiorna la revisione, cosi' non si
 * pubblicizza mai una revisione il cui blob non e' stato salvato.
 */
export async function push(): Promise<void> {
  const userId = await requireUserId();
  const adapter = new IndexedDbAdapter();
  const local = await adapter.load();
  if (!local) throw new Error("Nessun bundle locale da sincronizzare.");
  const localRevision = revisionOf(local);

  const remoteRevision = await getRemoteRevision(userId);
  if (remoteRevision !== null && remoteRevision > localRevision) {
    throw new ConflictError(localRevision, remoteRevision);
  }

  const blob = new Blob([local], { type: "application/json" });
  const { error } = await getSupabase()
    .storage.from(BUCKET)
    .upload(bundlePath(userId), blob, {
      upsert: true,
      contentType: "application/json",
    });
  if (error) throw new Error(error.message);

  await setRemoteRevision(userId, localRevision);
}
