import { toast } from "sonner";

export function toastActionError(err: unknown, fallback = "Errore") {
  toast.error(err instanceof Error ? err.message : fallback);
}
