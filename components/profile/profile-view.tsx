"use client";

import { PageHeader } from "@/components/layout/page-header";
import { CloudAccountSection } from "@/components/profile/cloud-account-section";
import { SecuritySection } from "@/components/profile/security-section";
import { useI18n } from "@/providers/i18n-provider";

export function ProfileView() {
  const { t } = useI18n();

  return (
    <div className="space-y-6 max-w-xl">
      <PageHeader
        title={t("profile.title")}
        description={t("profile.description")}
      />
      <CloudAccountSection />
      <SecuritySection />
    </div>
  );
}
