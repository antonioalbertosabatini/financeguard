/**
 * Client Supabase (lazy singleton) per il sync cloud opzionale.
 *
 * Le credenziali sono pubbliche per design (anon key + RLS): la sicurezza dei
 * dati e' garantita dalla crittografia client-side, non dal segreto della key.
 * Se le variabili NEXT_PUBLIC_SUPABASE_* non sono configurate, il cloud e'
 * semplicemente disattivato e l'app resta 100% locale.
 */
import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

/** True se il progetto e' stato configurato con URL + anon key. */
export function isCloudConfigured(): boolean {
  return Boolean(URL && ANON_KEY);
}

/** Restituisce il client Supabase, o lancia se il cloud non e' configurato. */
export function getSupabase(): SupabaseClient {
  if (!URL || !ANON_KEY) {
    throw new Error(
      "Cloud non configurato: imposta NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }
  if (!client) {
    client = createClient(URL, ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return client;
}
