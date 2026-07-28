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
import { getPasswordError } from "@/lib/constants";
import {
  buildEncryptedBackup,
  buildPlainBackup,
  readEncryptedBackup,
  readPlainBackup,
} from "@/lib/storage/backup-client";
import {
  getDataset,
  replaceDataset,
  replaceDatasetWithPassword,
} from "@/lib/storage/data-store";
import {
  beginLocalOverrideSync,
  cancelScheduledSync,
  syncNow,
} from "@/lib/sync/sync-orchestrator";
import { todayISO } from "@/lib/utils/dates";
import { toastActionError } from "@/lib/utils/toast";
import { useI18n } from "@/providers/i18n-provider";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function today() {
  return todayISO();
}

async function pushImportToCloud(): Promise<"pushed" | "skipped" | "failed"> {
  cancelScheduledSync();
  const result = await syncNow("import", { mode: "push-only" });
  if (result.pushed) return "pushed";
  if (result.ok && !result.error) return "skipped";
  return "failed";
}

export function DataView() {
  const { t } = useI18n();
  const [importing, setImporting] = useState(false);
  const [exportingPlain, setExportingPlain] = useState(false);

  const [exportPassword, setExportPassword] = useState("");
  const [exportConfirm, setExportConfirm] = useState("");
  const [exporting, setExporting] = useState(false);

  const [encFile, setEncFile] = useState<File | null>(null);
  const [importPassword, setImportPassword] = useState("");
  const [importingEnc, setImportingEnc] = useState(false);

  function toastImportResult(
    cloud: "pushed" | "skipped" | "failed",
    localKey: "data.imported" | "data.importEncryptedSuccess"
  ) {
    if (cloud === "pushed") {
      toast.success(t("data.importedCloudPushed"));
      return;
    }
    if (cloud === "failed") {
      toast.success(t(localKey));
      toast.warning(t("data.importedCloudPushFailed"));
      return;
    }
    toast.success(t(localKey));
  }

  async function handlePlainExport() {
    setExportingPlain(true);
    try {
      const blob = await buildPlainBackup(getDataset());
      downloadBlob(blob, `financeguard-export-${today()}.zip`);
      toast.success(t("data.exported"));
    } catch (err) {
      toastActionError(err, "common.errorExport");
    } finally {
      setExportingPlain(false);
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm(t("data.importPlainConfirm"))) {
      e.target.value = "";
      return;
    }

    setImporting(true);
    try {
      const dataset = await readPlainBackup(file);
      beginLocalOverrideSync();
      cancelScheduledSync();
      await replaceDataset(dataset);
      const cloud = await pushImportToCloud();
      toastImportResult(cloud, "data.imported");
    } catch (err) {
      toastActionError(err, "common.errorImport");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  }

  async function handleEncryptedExport(e: React.FormEvent) {
    e.preventDefault();
    if (exportPassword !== exportConfirm) {
      toast.error(t("data.passwordMismatch"));
      return;
    }
    const passwordError = getPasswordError(exportPassword);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }

    setExporting(true);
    try {
      const blob = await buildEncryptedBackup(getDataset(), exportPassword);
      downloadBlob(blob, `financeguard-backup-criptato-${today()}.zip`);
      toast.success(t("data.encryptedCreated"));
      setExportPassword("");
      setExportConfirm("");
    } catch (err) {
      toastActionError(err, "common.errorExport");
    } finally {
      setExporting(false);
    }
  }

  async function handleEncryptedImport(e: React.FormEvent) {
    e.preventDefault();
    if (!encFile) {
      toast.error(t("data.selectBackupFile"));
      return;
    }
    if (importPassword.length === 0) {
      toast.error(t("data.enterBackupPassword"));
      return;
    }
    if (!confirm(t("data.importEncryptedConfirm"))) {
      return;
    }

    setImportingEnc(true);
    try {
      const dataset = await readEncryptedBackup(encFile, importPassword);
      beginLocalOverrideSync();
      cancelScheduledSync();
      await replaceDatasetWithPassword(dataset, importPassword);
      const cloud = await pushImportToCloud();
      toastImportResult(cloud, "data.importEncryptedSuccess");
      setEncFile(null);
      setImportPassword("");
    } catch (err) {
      toastActionError(err, "common.errorImport");
    } finally {
      setImportingEnc(false);
    }
  }

  return (
    <div className="space-y-6 max-w-xl">
      <PageHeader
        title={t("data.title")}
        description={t("data.description")}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileDown className="size-4" />
            {t("data.exportPlainTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            {t("data.exportPlainDescription")}
          </p>
          <Button onClick={handlePlainExport} disabled={exportingPlain} className="w-full sm:w-auto">
            <Download className="size-4" />
            {exportingPlain ? t("data.exporting") : t("data.exportPlainButton")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4" />
            {t("data.exportEncryptedTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            {t("data.exportEncryptedDescription")}
          </p>
          <form onSubmit={handleEncryptedExport} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="export-password">{t("data.backupPassword")}</Label>
              <Input
                id="export-password"
                type="password"
                autoComplete="new-password"
                value={exportPassword}
                onChange={(e) => setExportPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="export-confirm">{t("auth.confirmPassword")}</Label>
              <Input
                id="export-confirm"
                type="password"
                autoComplete="new-password"
                value={exportConfirm}
                onChange={(e) => setExportConfirm(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={exporting} className="w-full sm:w-auto">
              <Lock className="size-4" />
              {exporting ? t("data.creating") : t("data.exportEncryptedButton")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileUp className="size-4" />
            {t("data.importPlainTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            {t("data.importPlainDescription")}
          </p>
          <Input
            type="file"
            accept=".zip"
            disabled={importing}
            onChange={handleImport}
          />
          {importing && (
            <p className="text-sm text-muted-foreground mt-2">
              {t("data.importing")}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileKey className="size-4" />
            {t("data.importEncryptedTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <span>{t("data.importEncryptedWarning")}</span>
          </div>
          <form onSubmit={handleEncryptedImport} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="import-file">{t("data.importFile")}</Label>
              <Input
                id="import-file"
                type="file"
                accept=".zip"
                disabled={importingEnc}
                onChange={(e) => setEncFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="import-password">{t("data.backupPassword")}</Label>
              <Input
                id="import-password"
                type="password"
                autoComplete="off"
                value={importPassword}
                onChange={(e) => setImportPassword(e.target.value)}
              />
            </div>
            <Button type="submit" variant="outline" disabled={importingEnc} className="w-full sm:w-auto">
              <Unlock className="size-4" />
              {importingEnc ? t("data.importing") : t("data.importEncryptedButton")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
