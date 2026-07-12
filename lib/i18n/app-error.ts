import type { MessageKey } from "@/lib/i18n/types";
import type { TranslateParams } from "@/lib/i18n/types";

export class AppError extends Error {
  readonly code: MessageKey;
  readonly params?: TranslateParams;

  constructor(code: MessageKey, params?: TranslateParams) {
    super(code);
    this.name = "AppError";
    this.code = code;
    this.params = params;
  }
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}
