"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Download,
  FileDown,
  FileKey,
  FileUp,
  Lock,
  ShieldCheck,
  TriangleAlert,
  Unlock,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MIN_PASSWORD_LENGTH = 8;

export function DataView() {
  const [importing, setImporting] = useState(false);

  const [exportPassword, setExportPassword] = useState("");
  const [exportConfirm, setExportConfirm] = useState("");
  const [exporting, setExporting] = useState(false);

  const [encFile, setEncFile] = useState<File | null>(null);
  const [importPassword, setImportPassword] = useState("");
  const [importingEnc, setImportingEnc] = useState(false);

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm("L'import sovrascriverà tutti i dati attuali. Continuare?")) {
      e.target.value = "";
      return;
    }

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/import", { method: "POST", body: formData });
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

  async function handleEncryptedExport(e: React.FormEvent) {
    e.preventDefault();
    if (exportPassword.length < MIN_PASSWORD_LENGTH) {
      toast.error(
        `La password deve avere almeno ${MIN_PASSWORD_LENGTH} caratteri.`
      );
      return;
    }
    if (exportPassword !== exportConfirm) {
      toast.error("Le password non coincidono.");
      return;
    }

    setExporting(true);
    try {
      const res = await fetch("/api/export/encrypted", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: exportPassword }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Export fallito");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `financeguard-backup-criptato-${new Date()
        .toISOString()
        .slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Backup criptato creato");
      setExportPassword("");
      setExportConfirm("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore export");
    } finally {
      setExporting(false);
    }
  }

  async function handleEncryptedImport(e: React.FormEvent) {
    e.preventDefault();
    if (!encFile) {
      toast.error("Seleziona un file di backup.");
      return;
    }
    if (importPassword.length === 0) {
      toast.error("Inserisci la password del backup.");
      return;
    }
    if (
      !confirm(
        "Importando questo backup criptato sovrascrivi tutti i dati attuali e la password di accesso diventerà quella del backup. Continuare?"
      )
    ) {
      return;
    }

    setImportingEnc(true);
    try {
      const formData = new FormData();
      formData.append("file", encFile);
      formData.append("password", importPassword);
      const res = await fetch("/api/import/encrypted", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Import fallito");
      }
      toast.success("Backup importato. La password di accesso è ora quella del backup.");
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore import");
    } finally {
      setImportingEnc(false);
    }
  }

  return (
    <div className="space-y-6 max-w-xl">
      <PageHeader
        title="Backup"
        description="Esporta e importa i tuoi dati, in chiaro o criptati"
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileDown className="size-4" />
            Esporta dati (in chiaro)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Scarica tutti i dati in un archivio ZIP leggibile, senza
            crittografia.
          </p>
          <Button asChild>
            <a href="/api/export" download>
              <Download className="size-4" />
              Esporta in chiaro
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4" />
            Esporta backup criptato
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Crea un backup protetto da una password a tua scelta (può essere
            diversa da quella di accesso). Servirà per reimportarlo.
          </p>
          <form onSubmit={handleEncryptedExport} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="export-password">Password del backup</Label>
              <Input
                id="export-password"
                type="password"
                autoComplete="new-password"
                value={exportPassword}
                onChange={(e) => setExportPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="export-confirm">Conferma password</Label>
              <Input
                id="export-confirm"
                type="password"
                autoComplete="new-password"
                value={exportConfirm}
                onChange={(e) => setExportConfirm(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={exporting}>
              <Lock className="size-4" />
              {exporting ? "Creazione…" : "Esporta criptato"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileUp className="size-4" />
            Importa dati (in chiaro)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Carica un archivio ZIP in chiaro esportato in precedenza. Sovrascrive
            i dati attuali.
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileKey className="size-4" />
            Importa backup criptato
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <span>
              Attenzione: questo sovrascrive tutti i dati attuali e la password
              di accesso diventerà quella del backup.
            </span>
          </div>
          <form onSubmit={handleEncryptedImport} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="import-file">File di backup (.zip)</Label>
              <Input
                id="import-file"
                type="file"
                accept=".zip"
                disabled={importingEnc}
                onChange={(e) => setEncFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="import-password">Password del backup</Label>
              <Input
                id="import-password"
                type="password"
                autoComplete="off"
                value={importPassword}
                onChange={(e) => setImportPassword(e.target.value)}
              />
            </div>
            <Button type="submit" variant="outline" disabled={importingEnc}>
              <Unlock className="size-4" />
              {importingEnc ? "Import in corso…" : "Importa criptato"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
