"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Cloud, CloudOff, LogIn, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SyncErrorDetailsDialog } from "@/components/sync/sync-error-details-dialog";
import { getSettings, updateSettings } from "@/lib/actions/settings";
import { useAsyncData } from "@/lib/storage/use-async-data";
import { getPasswordError } from "@/lib/constants";
import { formatErrorMessage } from "@/lib/i18n/translate";
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
import { getDateFnsLocale } from "@/lib/utils/dates";
import { useI18n } from "@/providers/i18n-provider";
import type { MessageKey } from "@/lib/i18n/types";

function SyncWarningToggle() {
  const { t, language } = useI18n();
  const { data: settings } = useAsyncData(() => getSettings(), []);
  const [busy, setBusy] = useState(false);

  async function handleChange(next: boolean) {
    if (!settings) return;
    setBusy(true);
    try {
      await updateSettings({ ...settings, showSyncWarning: next });
    } catch (err) {
      toast.error(formatErrorMessage(language, err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border p-3">
      <div className="space-y-0.5">
        <Label htmlFor="show-sync-warning" className="text-sm font-medium">
          {t("profile.syncWarningToggle")}
        </Label>
        <p className="text-xs text-muted-foreground">
          {t("profile.syncWarningDescription")}
        </p>
      </div>
      <Switch
        id="show-sync-warning"
        checked={settings?.showSyncWarning ?? true}
        disabled={busy || !settings}
        onCheckedChange={handleChange}
      />
    </div>
  );
}

const SYNC_STATUS_KEYS: Record<string, MessageKey> = {
  syncing: "sync.status.syncing",
  offline: "sync.status.offline",
  blocked: "sync.status.blocked",
  error: "sync.status.error",
  idle: "sync.status.idle",
};

export function CloudAccountSection() {
  const { t, language } = useI18n();
  const configured = isCloudConfigured();
  const syncState = useSyncState();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [loggedInEmail, setLoggedInEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [activeDevice, setActiveDevice] = useState<string | null>(null);

  function formatLastSync(iso: string | null): string {
    if (!iso) return t("common.never");
    try {
      return formatDistanceToNow(new Date(iso), {
        addSuffix: true,
        locale: getDateFnsLocale(language),
      });
    } catch {
      return t("common.none");
    }
  }

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
          setActiveDevice(session.device_name ?? t("profile.thisDevice"));
        } else if (session) {
          setActiveDevice(session.device_name ?? t("profile.otherDevice"));
        } else {
          setActiveDevice(null);
        }
      })
      .catch(() => setActiveDevice(null));
  }, [configured, signedIn, syncState.status, syncState.lastSyncedAt, t]);

  if (!configured) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CloudOff className="size-4" />
            {t("profile.cloudNotConfiguredTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t("profile.cloudNotConfiguredBody")}
          </p>
          <SyncWarningToggle />
        </CardContent>
      </Card>
    );
  }

  async function withBusy(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      toast.error(formatErrorMessage(language, err, "profile.cloudError"));
    } finally {
      setBusy(false);
    }
  }

  const passwordError = getPasswordError(password, language);
  const credentialsInvalid = !email.trim() || passwordError !== null;

  const handleSignIn = () =>
    withBusy(async () => {
      if (passwordError) throw new Error(passwordError);
      await signInCloud(email, password);
      setSignedIn(true);
      setPassword("");
      toast.success(t("profile.cloudSignedIn"));
      await syncNow("login");
    });

  const handleSignUp = () =>
    withBusy(async () => {
      if (passwordError) throw new Error(passwordError);
      await signUpCloud(email, password);
      toast.success(t("profile.cloudAccountCreated"));
    });

  const handleSignOut = () =>
    withBusy(async () => {
      await signOutCloud();
      setSignedIn(false);
      setLoggedInEmail(null);
      toast.success(t("profile.cloudSignedOut"));
    });

  const handleForceSync = () =>
    withBusy(async () => {
      const result = await syncNow("manual");
      if (result.ok) {
        toast.success(t("profile.syncCompleted"));
      } else {
        toast.error(t("profile.syncFailed"));
      }
    });

  const isSyncing = syncState.status === "syncing";
  const syncStatusKey =
    SYNC_STATUS_KEYS[syncState.status] ?? SYNC_STATUS_KEYS.idle;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cloud className="size-4" />
          {t("profile.cloudAccountTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {t("profile.cloudAccountDescription")}
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
              <Label htmlFor="cloud-email">{t("common.email")}</Label>
              <Input
                id="cloud-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cloud-password">{t("profile.masterPassword")}</Label>
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
                {t("profile.signIn")}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={busy || credentialsInvalid}
                onClick={handleSignUp}
              >
                {t("profile.createCloudAccount")}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            {loggedInEmail && (
              <p className="text-sm text-muted-foreground">
                {t("profile.signedInAs", { email: loggedInEmail })}
              </p>
            )}
            <div className="rounded-lg border bg-muted/40 p-3 text-sm space-y-1">
              <div className="flex items-center gap-2">
                {syncState.status === "syncing" && (
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                )}
                <span>{t(syncStatusKey)}</span>
              </div>
              <p className="text-muted-foreground">
                {t("profile.lastSync", {
                  time: formatLastSync(syncState.lastSyncedAt),
                })}
              </p>
              {activeDevice && (
                <p className="text-muted-foreground">
                  {t("profile.activeDevice", { device: activeDevice })}
                </p>
              )}
              {syncState.lastError && (
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-destructive text-xs">
                  <span>{t("profile.syncFailedInline")}</span>
                  <SyncErrorDetailsDialog
                    error={syncState.lastError}
                    trigger={
                      <Button
                        type="button"
                        variant="link"
                        className="h-auto p-0 text-xs text-destructive underline underline-offset-2"
                      >
                        {t("common.seeDetails")}
                      </Button>
                    }
                  />
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={busy || isSyncing}
                onClick={handleForceSync}
              >
                {isSyncing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                {t("profile.syncNow")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={handleSignOut}
              >
                {t("profile.signOut")}
              </Button>
            </div>
          </div>
        )}

        <SyncWarningToggle />
      </CardContent>
    </Card>
  );
}
