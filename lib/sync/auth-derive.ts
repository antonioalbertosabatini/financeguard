/**
 * Derivazione della credenziale di autenticazione cloud (modello "zero-knowledge"
 * stile Bitwarden).
 *
 * Dalla master password ricaviamo DUE segreti indipendenti:
 *  - la chiave di cifratura del vault: scrypt(password, saltCasuale) — gestita da
 *    lib/crypto/web-crypto, NON lascia mai il dispositivo.
 *  - l'`authHash`: scrypt("fg-auth\0" + password, email) — usato come password di
 *    Supabase Auth. Il server vede solo un bcrypt di questo valore: non puo'
 *    risalire ne' alla master password ne' alla chiave di cifratura.
 *
 * La domain separation (prefisso "fg-auth\0") e l'uso dell'email come salt fanno
 * si' che authHash sia deterministico tra dispositivi ma scorrelato dalla chiave
 * dati. L'email e' normalizzata (trim + lowercase) per essere stabile.
 */
import { deriveKeyWeb } from "@/lib/crypto/web-crypto";

const AUTH_DOMAIN = "fg-auth\0";

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Restituisce la "password" da passare a Supabase Auth: deterministica per
 * (email, master password), scorrelata dalla chiave di cifratura del vault.
 */
export function deriveAuthHash(email: string, password: string): string {
  const salt = new TextEncoder().encode(normalizeEmail(email));
  const derived = deriveKeyWeb(`${AUTH_DOMAIN}${password}`, salt);
  return toHex(derived);
}
