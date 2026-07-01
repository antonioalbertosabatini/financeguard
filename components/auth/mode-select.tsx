"use client";

import { useState } from "react";
import { Cloud, HardDrive, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { setAppMode, type AppMode } from "@/lib/storage/local-store";
import { isCloudConfigured } from "@/lib/sync/cloud-sync";

/**
 * Primo step dell'onboarding: scelta tra modalita' solo-locale e cloud.
 * Le variabili NEXT_PUBLIC_SUPABASE_* sono impostate a build-time, quindi qui
 * possiamo solo guidare: se il cloud non e' configurato mostriamo le istruzioni
 * e proponiamo di proseguire in locale.
 */
export function ModeSelect({
  onSelect,
}: {
  onSelect: (mode: AppMode) => void;
}) {
  const [cloudNotConfigured, setCloudNotConfigured] = useState(false);

  async function choose(mode: AppMode) {
    await setAppMode(mode);
    onSelect(mode);
  }

  function handleCloud() {
    if (isCloudConfigured()) {
      void choose("cloud");
    } else {
      setCloudNotConfigured(true);
    }
  }

  if (cloudNotConfigured) {
    return (
      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-100">
            <Cloud className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="space-y-1">
              <p className="font-medium">Cloud non configurato</p>
              <p>
                Le chiavi <code>NEXT_PUBLIC_SUPABASE_URL</code> e{" "}
                <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> non sono impostate.
                Crea un progetto Supabase, esegui le migrazioni in{" "}
                <code>supabase/migrations/</code> e compila un file{" "}
                <code>.env.local</code> (vedi <code>.env.example</code> e il
                README), poi riavvia l&apos;app. Nel frattempo puoi iniziare in
                modalità solo locale.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button className="w-full" onClick={() => choose("local")}>
              <HardDrive className="size-4" />
              Continua in locale
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setCloudNotConfigured(false)}
            >
              <ArrowLeft className="size-4" />
              Indietro
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-3">
        <button
          type="button"
          onClick={() => choose("local")}
          className="flex w-full items-start gap-3 rounded-lg border p-4 text-left transition-colors hover:border-primary hover:bg-muted/50"
        >
          <HardDrive className="mt-0.5 size-5 shrink-0 text-primary" />
          <div className="space-y-1">
            <p className="font-medium">Solo locale</p>
            <p className="text-sm text-muted-foreground">
              I dati restano cifrati solo su questo dispositivo. Nessun account,
              nessuna configurazione. Puoi comunque esportare backup criptati.
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={handleCloud}
          className="flex w-full items-start gap-3 rounded-lg border p-4 text-left transition-colors hover:border-primary hover:bg-muted/50"
        >
          <Cloud className="mt-0.5 size-5 shrink-0 text-primary" />
          <div className="space-y-1">
            <p className="font-medium">Cloud (sincronizzato)</p>
            <p className="text-sm text-muted-foreground">
              Sincronizza il vault cifrato tra i dispositivi tramite Supabase.
              Sul cloud finiscono solo dati cifrati: richiede la configurazione
              dell&apos;ambiente.
            </p>
          </div>
        </button>
      </CardContent>
    </Card>
  );
}
