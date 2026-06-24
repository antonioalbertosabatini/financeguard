/**
 * StorageAdapter di default per l'app multipiattaforma: il bundle cifrato vive
 * in IndexedDB. Funziona in modo identico nelle webview di Electron, Android e
 * iOS e persiste tra le sessioni senza chiedere all'utente di scegliere un file.
 *
 * La sincronizzazione su una cartella cloud (File System Access su desktop,
 * Capacitor Filesystem su mobile) resta un adapter alternativo da affiancare in
 * seguito: implementano la stessa interfaccia StorageAdapter.
 */
import type { StorageAdapter } from "@/lib/storage/adapter";
import { idbGet, idbSet } from "@/lib/storage/local-store";

const BUNDLE_KEY = "bundle";

export class IndexedDbAdapter implements StorageAdapter {
  readonly id = "indexeddb";

  async load(): Promise<string | null> {
    const text = await idbGet<string>(BUNDLE_KEY);
    return text && text.trim() !== "" ? text : null;
  }

  async save(content: string): Promise<void> {
    await idbSet(BUNDLE_KEY, content);
  }
}
