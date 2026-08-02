"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Tags, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateSettings } from "@/lib/actions/settings";
import { APP_VERSION } from "@/lib/app-version";
import { QUOTE_PROVIDERS, type QuoteProviderId } from "@/lib/market/config";
import {
  LANGUAGE_LABELS,
  SUPPORTED_LANGUAGES,
  type Language,
} from "@/lib/i18n/config";
import { settingsWithLanguage } from "@/lib/schemas/settings";
import type { Settings } from "@/lib/schemas/settings";
import { useI18n } from "@/providers/i18n-provider";
import { formatErrorMessage } from "@/lib/i18n/translate";
import type { MessageKey } from "@/lib/i18n/types";

const PROVIDER_LABEL_KEYS = {
  yahoo: "settings.marketProviderYahoo",
  twelvedata: "settings.marketProviderTwelveData",
  none: "settings.marketProviderNone",
} as const satisfies Record<QuoteProviderId, MessageKey>;

export function SettingsView({ settings }: { settings: Settings }) {
  const { t, language, setLanguage } = useI18n();
  const [currency, setCurrency] = useState(settings.defaultCurrency);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(
    settings.language
  );
  const [marketProvider, setMarketProvider] = useState<QuoteProviderId>(
    (settings.marketProvider as QuoteProviderId | null) ?? "yahoo"
  );
  const [marketApiKey, setMarketApiKey] = useState(settings.marketApiKey ?? "");

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    try {
      const next = settingsWithLanguage(
        {
          ...settings,
          defaultCurrency: currency,
          marketProvider,
          marketApiKey: marketApiKey.trim() || null,
        },
        selectedLanguage
      );
      await updateSettings(next);
      setLanguage(selectedLanguage);
      toast.success(t("settings.saved"));
    } catch (err) {
      toast.error(formatErrorMessage(language, err));
    }
  }

  return (
    <div className="space-y-6 max-w-xl">
      <PageHeader
        title={t("settings.title")}
        description={t("settings.description")}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.currencyTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currency">{t("settings.defaultCurrency")}</Label>
              <Input
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                maxLength={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="language">{t("settings.languageTitle")}</Label>
              <p className="text-sm text-muted-foreground">
                {t("settings.languageDescription")}
              </p>
              <Select
                value={selectedLanguage}
                onValueChange={(value) =>
                  setSelectedLanguage(value as Language)
                }
              >
                <SelectTrigger id="language" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <SelectItem key={lang} value={lang}>
                      {LANGUAGE_LABELS[lang]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full sm:w-auto">
              {t("settings.save")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="size-4" />
            {t("settings.marketTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("settings.marketDescription")}
            </p>
            <div className="space-y-2">
              <Label htmlFor="market-provider">
                {t("settings.marketProvider")}
              </Label>
              <Select
                value={marketProvider}
                onValueChange={(value) =>
                  setMarketProvider(value as QuoteProviderId)
                }
              >
                <SelectTrigger id="market-provider" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUOTE_PROVIDERS.map((provider) => (
                    <SelectItem key={provider} value={provider}>
                      {t(PROVIDER_LABEL_KEYS[provider])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="market-api-key">
                {t("settings.marketApiKey")}
              </Label>
              <Input
                id="market-api-key"
                type="password"
                autoComplete="off"
                value={marketApiKey}
                onChange={(e) => setMarketApiKey(e.target.value)}
                placeholder={t("settings.marketApiKeyPlaceholder")}
              />
              <p className="text-xs text-muted-foreground">
                {t("settings.marketApiKeyHint")}
              </p>
            </div>
            <Button type="submit" className="w-full sm:w-auto">
              {t("settings.save")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tags className="size-4" />
            {t("settings.categoriesTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            {t("settings.categoriesDescription")}
          </p>
          <Button variant="outline" asChild>
            <Link href="/categories">
              <Tags className="size-4" />
              {t("settings.manageCategories")}
            </Link>
          </Button>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        {t("settings.appVersion", { version: APP_VERSION })}
      </p>
    </div>
  );
}
