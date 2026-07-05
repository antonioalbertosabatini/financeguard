import { SessionLockedError } from "@/lib/sync/session-lock";

const FALLBACK_MESSAGE =
  "Errore di sincronizzazione cloud. Controlla la connessione e riprova.";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function formatSupabaseLikeError(value: Record<string, unknown>): string | null {
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
    return `Errore cloud (${code}): ${parts.join(" — ")}`;
  }

  return parts.join(" — ");
}

const OPERATION_ERROR_MESSAGE =
  "Impossibile decifrare i dati sul cloud. Verifica di usare la stessa master password su tutti i dispositivi.";

/**
 * Normalizza un errore di sync in un messaggio utente non vuoto.
 */
export function formatSyncError(err: unknown): string {
  if (err instanceof SessionLockedError) {
    return err.message;
  }

  if (
    typeof DOMException !== "undefined" &&
    err instanceof DOMException &&
    err.name === "OperationError"
  ) {
    return isNonEmptyString(err.message)
      ? err.message.trim()
      : OPERATION_ERROR_MESSAGE;
  }

  if (err instanceof Error) {
    if (isNonEmptyString(err.message)) {
      return err.message.trim();
    }
    if (isNonEmptyString(err.name) && err.name !== "Error") {
      return err.name.trim();
    }
  }

  if (typeof err === "string" && err.trim() !== "") {
    return err.trim();
  }

  if (err && typeof err === "object") {
    const formatted = formatSupabaseLikeError(err as Record<string, unknown>);
    if (formatted) return formatted;
  }

  return FALLBACK_MESSAGE;
}
