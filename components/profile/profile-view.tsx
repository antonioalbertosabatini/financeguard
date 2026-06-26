"use client";

import { PageHeader } from "@/components/layout/page-header";
import { CloudAccountSection } from "@/components/profile/cloud-account-section";
import { SecuritySection } from "@/components/profile/security-section";

export function ProfileView() {
  return (
    <div className="space-y-6 max-w-xl">
      <PageHeader
        title="Profilo"
        description="Account cloud, sicurezza e sincronizzazione"
      />
      <CloudAccountSection />
      <SecuritySection />
    </div>
  );
}
