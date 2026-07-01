"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Tags } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateSettings } from "@/lib/actions/settings";
import type { Settings } from "@/lib/schemas/settings";

export function SettingsView({ settings }: { settings: Settings }) {
  const [currency, setCurrency] = useState(settings.defaultCurrency);
  const [locale, setLocale] = useState(settings.locale);

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    try {
      await updateSettings({ ...settings, defaultCurrency: currency, locale });
      toast.success("Impostazioni salvate");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore");
    }
  }

  return (
    <div className="space-y-6 max-w-xl">
      <PageHeader title="Impostazioni" description="Valuta, locale e categorie" />

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
            <Button type="submit" className="w-full sm:w-auto">
              Salva impostazioni
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tags className="size-4" />
            Categorie
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Organizza le tue spese e entrate con categorie personalizzate.
          </p>
          <Button variant="outline" asChild>
            <Link href="/categories">
              <Tags className="size-4" />
              Gestisci categorie
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
