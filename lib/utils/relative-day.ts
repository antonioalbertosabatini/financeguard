import { format, subDays } from "date-fns";
import { formatDate } from "@/lib/utils/dates";
import type { Language } from "@/lib/i18n/config";

/**
 * "Oggi" / "Ieri" for the last two days, otherwise a short date
 * (e.g. "7 nov"). `labels` come from i18n (common.today / common.yesterday).
 */
export function relativeDayLabel(
  date: string,
  language: Language,
  labels: { today: string; yesterday: string },
  pattern = "d MMM"
): string {
  const now = new Date();
  if (date === format(now, "yyyy-MM-dd")) return labels.today;
  if (date === format(subDays(now, 1), "yyyy-MM-dd")) return labels.yesterday;
  return formatDate(date, pattern, language);
}
