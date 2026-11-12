import { describe, expect, it } from "vitest";
import { transactionInputSchema, transactionSchema } from "@/lib/schemas/transaction";

const tx = {
  date: "2026-11-11",
  amount: 8979,
  type: "expense" as const,
  categoryId: null,
  accountId: "acc_1",
  notes: "VOLOTEA",
  tags: [],
  isRecurring: false,
};

describe("transaction schemas", () => {
  it("il record salvato puo' restare senza categoria (import da file)", () => {
    expect(transactionSchema.safeParse({ ...tx, id: "tx_1", externalId: "tr:x" }).success).toBe(true);
  });

  it("l'inserimento manuale richiede la categoria", () => {
    expect(transactionInputSchema.safeParse(tx).success).toBe(false);
    expect(transactionInputSchema.safeParse({ ...tx, categoryId: "cat_1" }).success).toBe(true);
  });
});
