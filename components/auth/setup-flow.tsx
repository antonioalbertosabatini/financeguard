"use client";

import { useState } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { ModeSelect } from "@/components/auth/mode-select";
import { SetupForm } from "@/components/auth/setup-form";
import type { AppMode } from "@/lib/storage/local-store";

/**
 * Onboarding in due step: prima la scelta della modalita' (locale/cloud),
 * poi l'impostazione della master password.
 */
export function SetupFlow() {
  const [mode, setMode] = useState<AppMode | null>(null);

  if (!mode) {
    return (
      <AuthShell
        title="Benvenuto in FinanceGuard"
        description="Scegli come vuoi usare l'app. Potrai cambiare idea più avanti."
      >
        <ModeSelect onSelect={setMode} />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Imposta la password"
      description="Proteggi i tuoi dati con la crittografia zero-knowledge."
    >
      <SetupForm mode={mode} />
    </AuthShell>
  );
}
