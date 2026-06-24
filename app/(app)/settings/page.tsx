"use client";

import { SettingsView } from "@/components/settings/settings-view";
import { FullScreenLoader } from "@/components/providers/full-screen-loader";
import { getSettings } from "@/lib/actions/settings";
import { useAsyncData } from "@/lib/storage/use-async-data";

export default function SettingsPage() {
  const { data } = useAsyncData(() => getSettings(), []);
  if (!data) return <FullScreenLoader />;
  return <SettingsView settings={data} />;
}
