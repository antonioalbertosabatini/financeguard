"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { getSettings } from "@/lib/actions/settings";
import { useAsyncData } from "@/lib/storage/use-async-data";
import { hasCloudSession, isCloudConfigured } from "@/lib/sync/cloud-sync";
import { useSyncState } from "@/lib/sync/use-sync-state";

/**
 * Banner rosso in cima all'app quando il sync cloud NON e' attivo:
 * - il cloud non e' configurato (nessun account possibile), oppure
 * - e' configurato ma non c'e' una sessione attiva, oppure
 * - l'ultima sincronizzazione e' fallita.
 *
 * E' controllato dalla preferenza `settings.showSyncWarning` (default true,
 * disattivabile dal Profilo; parte OFF se l'utente sceglie la modalita' locale).
 */
export function CloudSyncAlert() {
  const configured = isCloudConfigured();
  const syncState = useSyncState();
  const { data: settings } = useAsyncData(() => getSettings(), []);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    // Quando il cloud non e' configurato non serve resettare `signedIn`: il
    // messaggio "non configurato" ha priorita' e non lo legge mai.
    if (!configured) return;
    let cancelled = false;
    hasCloudSession()
      .then((v) => !cancelled && setSignedIn(v))
      .catch(() => !cancelled && setSignedIn(false));
    return () => {
      cancelled = true;
    };
  }, [configured, syncState.status, syncState.lastSyncedAt]);

  // Rispetta la preferenza utente.
  if (!settings || settings.showSyncWarning === false) return null;

  const message = resolveMessage({
    configured,
    signedIn,
    syncState,
  });
  if (!message) return null;

  return (
    <div className="mb-6">
      <div
        role="alert"
        className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
      >
        <ShieldAlert className="mt-0.5 size-4 shrink-0" />
        <p className="flex-1 leading-relaxed">
          {message}{" "}
          <Link
            href="/profile"
            className="font-medium underline underline-offset-2"
          >
            Gestisci il cloud
          </Link>
        </p>
      </div>
    </div>
  );
}

function resolveMessage({
  configured,
  signedIn,
  syncState,
}: {
  configured: boolean;
  signedIn: boolean | null;
  syncState: ReturnType<typeof useSyncState>;
}): string | null {
  if (!configured) {
    return "Sincronizzazione cloud non attiva: nessun account configurato. I tuoi dati restano solo su questo dispositivo.";
  }
  if (syncState.status === "error" || syncState.lastError) {
    return `Sincronizzazione cloud fallita${
      syncState.lastError ? `: ${syncState.lastError}` : ""
    }.`;
  }
  if (signedIn === false) {
    return "Sincronizzazione cloud non attiva: non hai effettuato l'accesso all'account cloud.";
  }
  return null;
}
