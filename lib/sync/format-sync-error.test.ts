import { describe, expect, it } from "vitest";
import { translate } from "@/lib/i18n/translate";
import { formatSyncError } from "@/lib/sync/format-sync-error";
import { SessionLockedError } from "@/lib/sync/session-lock";

describe("formatSyncError", () => {
  it("restituisce il messaggio di SessionLockedError", () => {
    const err = new SessionLockedError("dev-1", "MacBook Pro", "2026-01-01T00:00:00Z");
    expect(formatSyncError(err)).toBe(
      translate("it", "errors.sessionLockedNamed", { deviceName: "MacBook Pro" })
    );
  });

  it("restituisce il messaggio di Error non vuoto", () => {
    expect(formatSyncError(new Error("Connessione rifiutata"))).toBe(
      "Connessione rifiutata"
    );
  });

  it("usa il fallback per Error con message vuoto", () => {
    expect(formatSyncError(new Error(""))).toBe(
      translate("it", "sync.fallbackError")
    );
  });

  it("formatta oggetti stile Supabase", () => {
    expect(
      formatSyncError({
        message: "new row violates row-level security policy",
        code: "42501",
        details: "Policy check failed",
      })
    ).toBe(
      translate("it", "sync.cloudErrorWithCode", {
        code: "42501",
        details:
          "new row violates row-level security policy — Policy check failed",
      })
    );
  });

  it("formatta stringhe dirette", () => {
    expect(formatSyncError("Timeout di rete")).toBe("Timeout di rete");
  });

  it("traduce OperationError senza messaggio", () => {
    if (typeof DOMException === "undefined") return;
    expect(formatSyncError(new DOMException("", "OperationError"))).toBe(
      translate("it", "sync.decryptFailed")
    );
  });

  it("usa il fallback per valori non riconosciuti", () => {
    expect(formatSyncError(null)).toBe(translate("it", "sync.fallbackError"));
    expect(formatSyncError({})).toBe(translate("it", "sync.fallbackError"));
  });
});
