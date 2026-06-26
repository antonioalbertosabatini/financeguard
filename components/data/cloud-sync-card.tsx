"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Cloud, CloudOff, LogIn, RefreshCw, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getPasswordError } from "@/lib/constants";
import { persistNow } from "@/lib/storage/data-store";
import {
  hasCloudSession,
  getCloudUserEmail,
  pull,
  push,
  signInCloud,
  signOutCloud,
  signUpCloud,
} from "@/lib/sync/cloud-sync";
import { isCloudConfigured } from "@/lib/sync/supabase-client";

/**
 * Sync cloud zero-knowledge (opt-in). Solo il bundle cifrato lascia il
 * dispositivo: Supabase non ha la chiave, quindi non puo' leggere i dati.
 * Accesso con email + master password (da cui si deriva una credenziale auth
 * separata dalla chiave di cifratura — vedi lib/sync/auth-derive).
 */
export function CloudSyncCard() {
  const configured = isCloudConfigured();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [loggedInEmail, setLoggedInEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (configured) hasCloudSession().then(setSignedIn).catch(() => {});
  }, [configured]);

  useEffect(() => {
    if (!configured || !signedIn) {
      setLoggedInEmail(null);
      return;
    }
    getCloudUserEmail()
      .then(setLoggedInEmail)
      .catch(() => setLoggedInEmail(null));
  }, [configured, signedIn]);

  if (!configured) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CloudOff className="size-4" />
            Sync cloud (non configurato)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Per attivare il sync cloud zero-knowledge crea un progetto Supabase,
            esegui <code>supabase/migrations/0001_vault.sql</code> e imposta{" "}
            <code>NEXT_PUBLIC_SUPABASE_URL</code> e{" "}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in <code>.env.local</code>{" "}
            (vedi <code>.env.local.example</code>). L&apos;app continua a
            funzionare al 100% in locale senza cloud.
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
    });

  const handleSignUp = () =>
    withBusy(async () => {
      if (passwordError) throw new Error(passwordError);
      await signUpCloud(email, password);
      toast.success(
        "Account cloud creato. Controlla l'email se è richiesta la conferma, poi accedi."
      );
    });

  const handlePush = () =>
    withBusy(async () => {
      await persistNow();
      await push();
      toast.success("Dati caricati sul cloud");
    });

  const handlePull = () =>
    withBusy(async () => {
      const updated = await pull();
      if (!updated) {
        toast.info("Il cloud non ha una versione più recente");
        return;
      }
      toast.success("Versione cloud scaricata. Ricarico l'app…");
      setTimeout(() => window.location.reload(), 800);
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
          Sync cloud (zero-knowledge)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Sincronizza il vault cifrato tra i dispositivi. Sul cloud finiscono
          solo dati cifrati: senza la tua master password nessuno (server
          incluso) può leggerli.
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
            <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={busy} onClick={handlePush}>
              <UploadCloud className="size-4" />
              Carica su cloud
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={handlePull}
            >
              <RefreshCw className="size-4" />
              Scarica da cloud
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={handleSignOut}
            >
              Disconnetti
            </Button>
          </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
