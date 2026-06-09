"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateSettings } from "@/lib/actions/settings";
import type { Settings } from "@/lib/schemas/settings";

export function SettingsView({ settings }: { settings: Settings }) {
  const [currency, setCurrency] = useState(settings.defaultCurrency);
  const [locale, setLocale] = useState(settings.locale);
  const [importing, setImporting] = useState(false);

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    try {
      await updateSettings({ defaultCurrency: currency, locale });
      toast.success("Impostazioni salvate");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore");
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (
      !confirm(
        "L'import sovrascriverà tutti i dati attuali. Continuare?"
      )
    ) {
      e.target.value = "";
      return;
    }

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Import fallito");
      }
      toast.success("Dati importati con successo");
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore import");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h2 className="text-2xl font-semibold">Impostazioni</h2>
        <p className="text-sm text-muted-foreground">
          Valuta, export e import dati
        </p>
      </div>

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
          <CardTitle>Export dati</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Scarica tutti i file JSON in un archivio ZIP.
          </p>
          <Button asChild>
            <a href="/api/export" download>
              <Download className="size-4" />
              Esporta dati
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Import dati</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Carica un archivio ZIP esportato in precedenza. Sovrascrive i dati
            attuali.
          </p>
          <Input
            type="file"
            accept=".zip"
            disabled={importing}
            onChange={handleImport}
          />
          {importing && (
            <p className="text-sm text-muted-foreground mt-2">Import in corso…</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
