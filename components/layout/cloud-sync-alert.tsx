"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { SyncErrorDetailsDialog } from "@/components/sync/sync-error-details-dialog";
import { getSettings } from "@/lib/actions/settings";
import { useAsyncData } from "@/lib/storage/use-async-data";
import { hasCloudSession, isCloudConfigured } from "@/lib/sync/cloud-sync";
import { useSyncState } from "@/lib/sync/use-sync-state";
import { useI18n } from "@/providers/i18n-provider";
import type { MessageKey } from "@/lib/i18n/types";

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
  const { t } = useI18n();
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
    t,
  });
  if (!message) return null;

  const showErrorDetails = Boolean(syncState.lastError?.trim());

  return (
    <div className="mb-6">
      <div
        role="alert"
        className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
      >
        <ShieldAlert className="mt-0.5 size-4 shrink-0" />
        <p className="flex-1 leading-relaxed">
          {message}{" "}
          {showErrorDetails && (
            <>
              <SyncErrorDetailsDialog error={syncState.lastError} />{" "}
            </>
          )}
          <Link
            href="/profile"
            className="font-medium underline underline-offset-2"
          >
            {t("sync.alert.manageCloud")}
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
  t,
}: {
  configured: boolean;
  signedIn: boolean | null;
  syncState: ReturnType<typeof useSyncState>;
  t: (key: MessageKey) => string;
}): string | null {
  if (!configured) {
    return t("sync.alert.notConfigured");
  }
  if (syncState.status === "error" || syncState.status === "blocked" || syncState.lastError) {
    return t("sync.alert.failed");
  }
  if (signedIn === false) {
    return t("sync.alert.notSignedIn");
  }
  return null;
}
