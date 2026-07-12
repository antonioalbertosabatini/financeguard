import { isAppError } from "@/lib/i18n/app-error";
import { getCurrentLanguage } from "@/lib/i18n/runtime";
import { formatErrorMessage, translate } from "@/lib/i18n/translate";
import { SessionLockedError } from "@/lib/sync/session-lock";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function formatSupabaseLikeError(
  value: Record<string, unknown>,
  language = getCurrentLanguage()
): string | null {
  const parts: string[] = [];

  if (isNonEmptyString(value.message)) {
    parts.push(value.message.trim());
  }

  if (isNonEmptyString(value.details)) {
    parts.push(value.details.trim());
  }

  if (isNonEmptyString(value.hint)) {
    parts.push(value.hint.trim());
  }

  if (parts.length === 0) return null;

  const code =
    typeof value.code === "string" && value.code.trim() !== ""
      ? value.code.trim()
      : typeof value.status === "number"
        ? String(value.status)
        : null;

  if (code) {
    return translate(language, "sync.cloudErrorWithCode", {
      code,
      details: parts.join(" — "),
    });
  }

  return parts.join(" — ");
}

/**
 * Normalizza un errore di sync in un messaggio utente non vuoto.
 */
export function formatSyncError(err: unknown): string {
  const language = getCurrentLanguage();

  if (err instanceof SessionLockedError || isAppError(err)) {
    return formatErrorMessage(language, err);
  }

  if (
    typeof DOMException !== "undefined" &&
    err instanceof DOMException &&
    err.name === "OperationError"
  ) {
    return isNonEmptyString(err.message)
      ? err.message.trim()
      : translate(language, "sync.decryptFailed");
  }

  if (err instanceof Error) {
    const formatted = formatErrorMessage(language, err);
    if (formatted !== translate(language, "common.error")) {
      return formatted;
    }
    if (isNonEmptyString(err.name) && err.name !== "Error") {
      return err.name.trim();
    }
  }

  if (typeof err === "string" && err.trim() !== "") {
    return err.trim();
  }

  if (err && typeof err === "object") {
    const formatted = formatSupabaseLikeError(err as Record<string, unknown>, language);
    if (formatted) return formatted;
  }

  return translate(language, "sync.fallbackError");
}
