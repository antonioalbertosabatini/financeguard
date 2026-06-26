"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { KeyRound, Lock } from "lucide-react";
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
import { changePassword, lockApp } from "@/lib/actions/auth";

export function SecuritySection() {
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
      toast.success("Password aggiornata");
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
            Cambia password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Aggiorna la master password. I dati verranno ricifrati con la nuova
            password.
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
            nuovo la password e rilasciare la sessione cloud su questo
            dispositivo.
          </p>
          <Button
            variant="outline"
            disabled={locking}
            onClick={() => startLocking(() => void lockApp())}
          >
            <Lock className="size-4" />
            Blocca app
          </Button>
        </CardContent>
      </Card>

      <Sheet open={passwordOpen} onOpenChange={setPasswordOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <KeyRound className="size-4" />
              Cambia password
            </SheetTitle>
          </SheetHeader>
          <form
            onSubmit={handleChangePassword}
            className="space-y-4 overflow-y-auto"
          >
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
            <SheetFooter>
              <Button
                type="submit"
                disabled={changingPassword}
                className="w-full sm:w-auto"
              >
                {changingPassword ? "Salvataggio…" : "Salva"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
