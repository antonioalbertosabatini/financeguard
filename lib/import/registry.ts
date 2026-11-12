import { tradeRepublicImporter } from "@/lib/import/banks/trade-republic";
import type { BankImporter } from "@/lib/import/types";

/** Banche supportate dall'import da file. Per aggiungerne una: nuovo parser in banks/. */
export const BANK_IMPORTERS: BankImporter[] = [tradeRepublicImporter];

export function getBankImporter(id: string): BankImporter | undefined {
  return BANK_IMPORTERS.find((importer) => importer.id === id);
}
