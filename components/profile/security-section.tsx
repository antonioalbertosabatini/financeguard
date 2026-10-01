"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { KeyRound, Lock, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { changePassword, lockApp } from "@/lib/actions/auth";
import {
  disableQuickAdd,
  enableQuickAdd,
  isQuickAddAvailable,
  isQuickAddEnabled,
} from "@/lib/native/quick-add";
import { useI18n } from "@/providers/i18n-provider";
import type { MessageKey } from "@/lib/i18n/types";

function quickAddErrorKey(err: unknown): MessageKey {
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code: unknown }).code)
      : "";
  if (code === "unavailable") return "profile.quickAddNeedBiometrics";
  if (code === "canceled") return "profile.quickAddAuthCanceled";
  return "profile.quickAddEnableError";
}

function QuickAddSection() {
  const { t } = useI18n();
  const [available, setAvailable] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const ok = await isQuickAddAvailable();
      setAvailable(ok);
      if (ok) setEnabled(await isQuickAddEnabled());
    })();
  }, []);

  if (!available) return null;

  async function handleChange(next: boolean) {
    setBusy(true);
    try {
      if (next) await enableQuickAdd();
      else await disableQuickAdd();
      setEnabled(next);
      toast.success(
        next ? t("profile.quickAddEnabled") : t("profile.quickAddDisabled")
      );
    } catch (err) {
      const key = quickAddErrorKey(err);
      if (key !== "profile.quickAddAuthCanceled") {
        toast.error(t(key));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="size-4" />
          {t("profile.quickAddTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {t("profile.quickAddDescription")}
          </p>
          <Switch
            id="quick-add"
            checked={enabled}
            disabled={busy}
            onCheckedChange={(checked) => void handleChange(checked)}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export function SecuritySection() {
  const { t } = useI18n();
  const [locking, startLocking] = useTransition();
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [changingPassword, startChangingPassword] = useTransition();

  function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    startChangingPassword(async () => {
      const result = await changePassword(
        oldPassword,
        newPassword,
        confirmPassword
      );
      if (result?.error) {
        setPasswordError(result.error);
        return;
      }
      toast.success(t("profile.passwordUpdated"));
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordOpen(false);
    });
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="size-4" />
            {t("profile.changePasswordTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            {t("profile.changePasswordDescription")}
          </p>
          <Button variant="outline" onClick={() => setPasswordOpen(true)}>
            <KeyRound className="size-4" />
            {t("profile.changePasswordTitle")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("profile.securityTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            {t("profile.securityDescription")}
          </p>
          <Button
            variant="outline"
            disabled={locking}
            onClick={() => startLocking(() => void lockApp())}
          >
            <Lock className="size-4" />
            {t("profile.lockApp")}
          </Button>
        </CardContent>
      </Card>

      <QuickAddSection />

      <Sheet open={passwordOpen} onOpenChange={setPasswordOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <KeyRound className="size-4" />
              {t("profile.changePasswordTitle")}
            </SheetTitle>
          </SheetHeader>
          <form
            onSubmit={handleChangePassword}
            className="space-y-4 overflow-y-auto"
          >
            <div className="space-y-2">
              <Label htmlFor="old-password">{t("profile.oldPassword")}</Label>
              <Input
                id="old-password"
                type="password"
                autoComplete="current-password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                aria-invalid={passwordError ? true : undefined}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">{t("profile.newPassword")}</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                aria-invalid={passwordError ? true : undefined}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">
                {t("profile.confirmNewPassword")}
              </Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                aria-invalid={passwordError ? true : undefined}
              />
            </div>
            {passwordError && (
              <p className="text-sm text-destructive">{passwordError}</p>
            )}
            <SheetFooter>
              <Button
                type="submit"
                disabled={changingPassword}
                className="w-full sm:w-auto"
              >
                {changingPassword ? t("profile.saving") : t("common.save")}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
