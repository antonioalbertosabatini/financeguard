import { SettingsView } from "@/components/settings/settings-view";
import { getSettings } from "@/lib/actions/settings";

export default async function SettingsPage() {
  const settings = await getSettings();
  return <SettingsView settings={settings} />;
}
