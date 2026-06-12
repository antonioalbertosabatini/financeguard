"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { KeyRound, Lock } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateSettings } from "@/lib/actions/settings";
import { changePassword, lockApp } from "@/lib/actions/auth";
import type { Settings } from "@/lib/schemas/settings";

export function SettingsView({ settings }: { settings: Settings }) {
  const [currency, setCurrency] = useState(settings.defaultCurrency);
  const [locale, setLocale] = useState(settings.locale);
  const [locking, startLocking] = useTransition();

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [changingPassword, startChangingPassword] = useTransition();

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    try {
      await updateSettings({ defaultCurrency: currency, locale });
      toast.success("Impostazioni salvate");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore");
    }
  }

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
      toast.success("Password aggiornata");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordOpen(false);
    });
  }

  return (
    <div className="space-y-6 max-w-xl">
      <PageHeader title="Impostazioni" description="Valuta e sicurezza" />

      <Card>
        <CardHeader>
          <CardTitle>Valuta e locale</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currency">Valuta predefinita</Label>
              <Input
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                maxLength={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="locale">Locale</Label>
              <Input
                id="locale"
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
              />
            </div>
            <Button type="submit">Salva impostazioni</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="size-4" />
            Cambia password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Aggiorna la password di accesso. I dati verranno ricifrati con la
            nuova password.
          </p>
          <Button variant="outline" onClick={() => setPasswordOpen(true)}>
            <KeyRound className="size-4" />
            Cambia password
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sicurezza</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            I dati sono cifrati a riposo. Blocca l&apos;app per richiedere di
            nuovo la password.
          </p>
          <Button
            variant="outline"
            disabled={locking}
            onClick={() => startLocking(() => lockApp())}
          >
            <Lock className="size-4" />
            Blocca app
          </Button>
        </CardContent>
      </Card>

      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="size-4" />
              Cambia password
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="old-password">Vecchia password</Label>
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
              <Label htmlFor="new-password">Nuova password</Label>
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
              <Label htmlFor="confirm-password">Conferma nuova password</Label>
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
            <DialogFooter>
              <Button type="submit" disabled={changingPassword}>
                {changingPassword ? "Salvataggio…" : "Salva"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
