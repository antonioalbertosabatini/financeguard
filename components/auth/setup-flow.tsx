"use client";

import { useState } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { ModeSelect } from "@/components/auth/mode-select";
import { SetupForm } from "@/components/auth/setup-form";
import type { AppMode } from "@/lib/storage/local-store";
import { useI18n } from "@/providers/i18n-provider";

/**
 * Onboarding in due step: prima la scelta della modalita' (locale/cloud),
 * poi l'impostazione della master password.
 */
export function SetupFlow() {
  const { t } = useI18n();
  const [mode, setMode] = useState<AppMode | null>(null);

  if (!mode) {
    return (
      <AuthShell
        title={t("auth.welcomeTitle")}
        description={t("auth.welcomeDescription")}
      >
        <ModeSelect onSelect={setMode} />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={t("auth.setupPasswordTitle")}
      description={t("auth.setupPasswordDescription")}
    >
      <SetupForm mode={mode} />
    </AuthShell>
  );
}
