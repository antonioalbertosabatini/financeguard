"use client";

import { SettingsView } from "@/components/settings/settings-view";
import { ErrorState } from "@/components/common/error-state";
import { PageSkeleton } from "@/components/common/page-skeleton";
import { getSettings } from "@/lib/actions/settings";
import { useAsyncData } from "@/lib/storage/use-async-data";

export default function SettingsPage() {
  const { data, failed, error, reload } = useAsyncData(() => getSettings(), []);
  if (!data && failed) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <PageSkeleton variant="form" />;
  return <SettingsView settings={data} />;
}
