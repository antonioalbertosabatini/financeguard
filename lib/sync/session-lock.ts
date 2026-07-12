/**
 * Lock di sessione cloud: una sola sessione attiva per utente (heartbeat 5 min).
 */
import { AppError } from "@/lib/i18n/app-error";
import { getDeviceName } from "@/lib/sync/device-name";
import { getLocalDeviceId } from "@/lib/storage/local-store";
import { getSupabase } from "@/lib/sync/supabase-client";

export const SESSION_HEARTBEAT_TIMEOUT_MS = 2 * 60 * 1000;
export const SESSION_HEARTBEAT_INTERVAL_MS = 60 * 1000;

export interface ActiveSessionRow {
  user_id: string;
  device_id: string;
  device_name: string | null;
  heartbeat_at: string;
  acquired_at: string;
}

export class SessionLockedError extends AppError {
  readonly activeDeviceId: string;
  readonly activeDeviceName: string | null;
  readonly heartbeatAt: string;

  constructor(
    activeDeviceId: string,
    activeDeviceName: string | null,
    heartbeatAt: string
  ) {
    super(
      activeDeviceName
        ? "errors.sessionLockedNamed"
        : "errors.sessionLockedGeneric",
      activeDeviceName ? { deviceName: activeDeviceName } : undefined
    );
    this.name = "SessionLockedError";
    this.activeDeviceId = activeDeviceId;
    this.activeDeviceName = activeDeviceName;
    this.heartbeatAt = heartbeatAt;
  }
}

export function isSessionStale(heartbeatAt: string, now = Date.now()): boolean {
  return now - new Date(heartbeatAt).getTime() > SESSION_HEARTBEAT_TIMEOUT_MS;
}

async function requireUserId(): Promise<string> {
  const { data } = await getSupabase().auth.getUser();
  if (!data.user) throw new AppError("errors.noCloudSession");
  return data.user.id;
}

async function getActiveSession(
  userId: string
): Promise<ActiveSessionRow | null> {
  const { data, error } = await getSupabase()
    .from("active_sessions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as ActiveSessionRow | null;
}

/**
 * Acquisisce o rinnova il lock per il dispositivo corrente.
 * Lancia SessionLockedError se un altro dispositivo ha una sessione attiva.
 */
export async function acquireSessionLock(): Promise<void> {
  const userId = await requireUserId();
  const deviceId = await getLocalDeviceId();
  const deviceName = getDeviceName();
  const now = new Date().toISOString();

  const existing = await getActiveSession(userId);

  if (!existing) {
    const { error } = await getSupabase().from("active_sessions").insert({
      user_id: userId,
      device_id: deviceId,
      device_name: deviceName,
      heartbeat_at: now,
      acquired_at: now,
    });
    if (error) throw new Error(error.message);
    return;
  }

  if (existing.device_id === deviceId) {
    await refreshSessionHeartbeat();
    return;
  }

  if (isSessionStale(existing.heartbeat_at)) {
    const { error } = await getSupabase()
      .from("active_sessions")
      .update({
        device_id: deviceId,
        device_name: deviceName,
        heartbeat_at: now,
        acquired_at: now,
      })
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return;
  }

  throw new SessionLockedError(
    existing.device_id,
    existing.device_name,
    existing.heartbeat_at
  );
}

/** Rinnova il heartbeat se il dispositivo corrente possiede il lock. */
export async function refreshSessionHeartbeat(): Promise<void> {
  const userId = await requireUserId();
  const deviceId = await getLocalDeviceId();
  const now = new Date().toISOString();

  const { error } = await getSupabase()
    .from("active_sessions")
    .update({ heartbeat_at: now, device_name: getDeviceName() })
    .eq("user_id", userId)
    .eq("device_id", deviceId);

  if (error) throw new Error(error.message);
}

/** Rilascia il lock del dispositivo corrente. */
export async function releaseSessionLock(): Promise<void> {
  const { data } = await getSupabase().auth.getUser();
  if (!data.user) return;

  const deviceId = await getLocalDeviceId();
  await getSupabase()
    .from("active_sessions")
    .delete()
    .eq("user_id", data.user.id)
    .eq("device_id", deviceId);
}

/** Info sessione attiva (per UI). */
export async function getActiveSessionInfo(): Promise<{
  isOwner: boolean;
  session: ActiveSessionRow | null;
}> {
  const { data } = await getSupabase().auth.getUser();
  if (!data.user) return { isOwner: false, session: null };

  const deviceId = await getLocalDeviceId();
  const session = await getActiveSession(data.user.id);
  if (!session) return { isOwner: false, session: null };

  const active =
    !isSessionStale(session.heartbeat_at) || session.device_id === deviceId;

  return {
    isOwner: session.device_id === deviceId && active,
    session: active ? session : null,
  };
}
