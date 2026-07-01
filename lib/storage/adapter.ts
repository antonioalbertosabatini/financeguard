/**
 * Storage abstraction for encrypted bundle read/write.
 */
export interface StorageAdapter {
  readonly id: string;
  load(): Promise<string | null>;
  save(content: string): Promise<void>;
}
