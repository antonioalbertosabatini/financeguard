"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Cloud, CloudOff, LogIn, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getPasswordError } from "@/lib/constants";
import {
  getCloudUserEmail,
  hasCloudSession,
  signInCloud,
  signOutCloud,
  signUpCloud,
  isCloudConfigured,
} from "@/lib/sync/cloud-sync";
import { getActiveSessionInfo } from "@/lib/sync/session-lock";
import { useSyncState } from "@/lib/sync/use-sync-state";
import { syncNow } from "@/lib/sync/sync-orchestrator";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

function formatLastSync(iso: string | null): string {
  if (!iso) return "Mai";
  try {
    return formatDistanceToNow(new Date(iso), {
      addSuffix: true,
      locale: it,
    });
  } catch {
    return "—";
  }
}

function syncStatusLabel(status: string): string {
  switch (status) {
    case "syncing":
      return "Sincronizzazione in corso…";
    case "offline":
      return "Offline — le modifiche verranno inviate al ritorno online";
    case "blocked":
      return "Sessione attiva su un altro dispositivo";
    case "error":
      return "Errore di sincronizzazione";
    default:
      return "Sincronizzazione automatica attiva";
  }
}

export function CloudAccountSection() {
  const configured = isCloudConfigured();
  const syncState = useSyncState();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [loggedInEmail, setLoggedInEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [activeDevice, setActiveDevice] = useState<string | null>(null);

  useEffect(() => {
    if (configured) hasCloudSession().then(setSignedIn).catch(() => {});
  }, [configured]);

  useEffect(() => {
    if (!configured || !signedIn) {
      setLoggedInEmail(null);
      setActiveDevice(null);
      return;
    }
    getCloudUserEmail()
      .then(setLoggedInEmail)
      .catch(() => setLoggedInEmail(null));
    getActiveSessionInfo()
      .then(({ session, isOwner }) => {
        if (session && isOwner) {
          setActiveDevice(session.device_name ?? "Questo dispositivo");
        } else if (session) {
          setActiveDevice(session.device_name ?? "Altro dispositivo");
        } else {
          setActiveDevice(null);
        }
      })
      .catch(() => setActiveDevice(null));
  }, [configured, signedIn, syncState.status, syncState.lastSyncedAt]);

  if (!configured) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CloudOff className="size-4" />
            Account cloud (non configurato)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Per attivare il sync cloud zero-knowledge crea un progetto Supabase,
            esegui le migrazioni in <code>supabase/migrations/</code> e imposta{" "}
            <code>NEXT_PUBLIC_SUPABASE_URL</code> e{" "}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in <code>.env.local</code>.
          </p>
        </CardContent>
      </Card>
    );
  }

  async function withBusy(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore cloud");
    } finally {
      setBusy(false);
    }
  }

  const passwordError = getPasswordError(password);
  const credentialsInvalid = !email.trim() || passwordError !== null;

  const handleSignIn = () =>
    withBusy(async () => {
      if (passwordError) throw new Error(passwordError);
      await signInCloud(email, password);
      setSignedIn(true);
      setPassword("");
      toast.success("Accesso cloud effettuato");
      await syncNow("login");
    });

  const handleSignUp = () =>
    withBusy(async () => {
      if (passwordError) throw new Error(passwordError);
      await signUpCloud(email, password);
      toast.success(
        "Account cloud creato. Controlla l'email se è richiesta la conferma, poi accedi."
      );
    });

  const handleSignOut = () =>
    withBusy(async () => {
      await signOutCloud();
      setSignedIn(false);
      setLoggedInEmail(null);
      toast.success("Disconnesso dal cloud");
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cloud className="size-4" />
          Account cloud
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Sincronizza automaticamente il vault cifrato tra i dispositivi. Sul
          cloud finiscono solo dati cifrati: senza la master password nessuno
          può leggerli.
        </p>

        {!signedIn ? (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              handleSignIn();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="cloud-email">Email</Label>
              <Input
                id="cloud-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cloud-password">Master password</Label>
              <Input
                id="cloud-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={password.length > 0 && !!passwordError}
              />
              {password.length > 0 && passwordError && (
                <p className="text-xs text-destructive">{passwordError}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={busy || credentialsInvalid}>
                <LogIn className="size-4" />
                Accedi
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={busy || credentialsInvalid}
                onClick={handleSignUp}
              >
                Crea account cloud
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            {loggedInEmail && (
              <p className="text-sm text-muted-foreground">
                Connesso come: {loggedInEmail}
              </p>
            )}
            <div className="rounded-lg border bg-muted/40 p-3 text-sm space-y-1">
              <div className="flex items-center gap-2">
                {syncState.status === "syncing" && (
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                )}
                <span>{syncStatusLabel(syncState.status)}</span>
              </div>
              <p className="text-muted-foreground">
                Ultimo sync: {formatLastSync(syncState.lastSyncedAt)}
              </p>
              {activeDevice && (
                <p className="text-muted-foreground">
                  Dispositivo attivo: {activeDevice}
                </p>
              )}
              {syncState.lastError && (
                <p className="text-destructive text-xs">{syncState.lastError}</p>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={handleSignOut}
            >
              Disconnetti
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
