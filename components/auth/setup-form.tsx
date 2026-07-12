"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setupPassword } from "@/lib/actions/auth";
import { getSettings, updateSettings } from "@/lib/actions/settings";
import { MIN_PASSWORD_LENGTH } from "@/lib/constants";
import type { AppMode } from "@/lib/storage/local-store";
import { cn } from "@/lib/utils";
import { useI18n } from "@/providers/i18n-provider";

const STRENGTH_KEYS = [
  "auth.strengthVeryWeak",
  "auth.strengthWeak",
  "auth.strengthFair",
  "auth.strengthGood",
  "auth.strengthExcellent",
] as const;

const STRENGTH_COLORS = [
  "bg-destructive",
  "bg-destructive",
  "bg-amber-500",
  "bg-success",
  "bg-success",
];

function passwordStrength(pw: string): number {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= MIN_PASSWORD_LENGTH) score++;
  if (pw.length >= 16) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;
  return Math.min(score, 4);
}

export function SetupForm({ mode = "local" }: { mode?: AppMode }) {
  const { t } = useI18n();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const strength = passwordStrength(password);
  const strengthLabel = useMemo(
    () => t(STRENGTH_KEYS[strength]),
    [strength, t]
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await setupPassword(password, confirm);
      if (result?.error) {
        setError(result.error);
        return;
      }
      // Onboarding in locale: l'utente non ha scelto il cloud, quindi non lo
      // infastidiamo con il banner rosso (resta attivabile dal Profilo).
      if (mode === "local") {
        const settings = await getSettings();
        await updateSettings({ ...settings, showSyncWarning: false });
      } else {
        toast.info(t("auth.cloudSyncHint"));
      }
    });
  }

  return (
    <Card>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">{t("common.password")}</Label>
            <Input
              id="password"
              type="password"
              autoFocus
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={error ? true : undefined}
            />
            {password.length > 0 && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={cn(
                        "h-1.5 flex-1 rounded-full transition-colors",
                        i < strength
                          ? STRENGTH_COLORS[strength]
                          : "bg-muted"
                      )}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("auth.strengthLabel", { label: strengthLabel })}
                </p>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">{t("auth.confirmPassword")}</Label>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              aria-invalid={error ? true : undefined}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <div className="space-y-1">
              <p className="font-medium">{t("auth.noRecoveryTitle")}</p>
              <p>
                {t("auth.noRecoveryBody", { minLength: MIN_PASSWORD_LENGTH })}
              </p>
            </div>
          </div>
          <label className="flex items-start gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              className="mt-0.5 size-4"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
            />
            <span>{t("auth.acknowledgeLoss")}</span>
          </label>
          <Button
            type="submit"
            className="w-full"
            disabled={pending || !acknowledged}
          >
            {pending ? t("auth.creating") : t("auth.setPassword")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
