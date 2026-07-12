"use client";

import { useState } from "react";
import { Cloud, HardDrive, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { setAppMode, type AppMode } from "@/lib/storage/local-store";
import { isCloudConfigured } from "@/lib/sync/cloud-sync";
import { useI18n } from "@/providers/i18n-provider";

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
  const { t } = useI18n();
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
              <p className="font-medium">{t("auth.cloudNotConfiguredTitle")}</p>
              <p>{t("auth.cloudNotConfiguredBody")}</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button className="w-full" onClick={() => choose("local")}>
              <HardDrive className="size-4" />
              {t("auth.continueLocal")}
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setCloudNotConfigured(false)}
            >
              <ArrowLeft className="size-4" />
              {t("common.back")}
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
            <p className="font-medium">{t("auth.modeLocalTitle")}</p>
            <p className="text-sm text-muted-foreground">
              {t("auth.modeLocalDescription")}
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
            <p className="font-medium">{t("auth.modeCloudTitle")}</p>
            <p className="text-sm text-muted-foreground">
              {t("auth.modeCloudDescription")}
            </p>
          </div>
        </button>
      </CardContent>
    </Card>
  );
}
