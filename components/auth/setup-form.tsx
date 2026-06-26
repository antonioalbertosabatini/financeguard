"use client";

import { useState, useTransition } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setupPassword } from "@/lib/actions/auth";
import { MIN_PASSWORD_LENGTH } from "@/lib/constants";
import { cn } from "@/lib/utils";

const STRENGTH_LABELS = ["Molto debole", "Debole", "Sufficiente", "Buona", "Ottima"];
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

export function SetupForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const strength = passwordStrength(password);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await setupPassword(password, confirm);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <Card>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
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
                  Robustezza: {STRENGTH_LABELS[strength]}
                </p>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Conferma password</Label>
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
              <p className="font-medium">Nessun recupero possibile</p>
              <p>
                FinanceGuard è zero-knowledge: la password non è memorizzata da
                nessuna parte, nemmeno sul cloud. Se la dimentichi, i dati sono
                persi per sempre. Usa almeno {MIN_PASSWORD_LENGTH} caratteri,
                conservala con cura ed esporta regolarmente un backup criptato.
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
            <span>
              Ho capito: se perdo la password, perdo l&apos;accesso ai miei dati.
            </span>
          </label>
          <Button
            type="submit"
            className="w-full"
            disabled={pending || !acknowledged}
          >
            {pending ? "Creazione…" : "Imposta password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
