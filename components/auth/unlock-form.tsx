"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { unlockApp } from "@/lib/actions/auth";
import { useI18n } from "@/providers/i18n-provider";

export function UnlockForm() {
  const { t } = useI18n();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await unlockApp(password);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      if (result.imported === 1) {
        toast.success(t("quickAdd.importedOne"));
      } else if (result.imported > 1) {
        toast.success(t("quickAdd.imported", { count: result.imported }));
      }
      if (result.skipped > 0) {
        toast.warning(t("quickAdd.skipped", { count: result.skipped }));
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
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={error ? true : undefined}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? t("auth.unlocking") : t("auth.unlock")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
