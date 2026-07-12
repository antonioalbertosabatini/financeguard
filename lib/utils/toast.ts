import { toast } from "sonner";
import { getCurrentLanguage } from "@/lib/i18n/runtime";
import { formatErrorMessage } from "@/lib/i18n/translate";
import type { MessageKey } from "@/lib/i18n/types";

export function toastActionError(
  err: unknown,
  fallbackKey: MessageKey = "common.error"
) {
  toast.error(formatErrorMessage(getCurrentLanguage(), err, fallbackKey));
}
