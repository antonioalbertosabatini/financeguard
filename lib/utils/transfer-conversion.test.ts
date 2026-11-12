import { describe, expect, it } from "vitest";
import {
  findMirrorTransactions,
  isConvertibleToTransfer,
  transferDirection,
} from "@/lib/utils/transfer-conversion";

const base = { isRecurring: false };
const income = { ...base, id: "t1", type: "income" as const, amount: 20000, date: "2026-11-11", accountId: "tr" };

describe("transfer conversion", () => {
  it("calcola la direzione del trasferimento", () => {
    expect(transferDirection(income, "bank")).toEqual({ fromAccountId: "bank", toAccountId: "tr" });
    expect(transferDirection({ ...income, type: "expense" }, "bank")).toEqual({
      fromAccountId: "tr",
      toAccountId: "bank",
    });
  });

  it("solo entrate/uscite non ricorrenti sono convertibili", () => {
    expect(isConvertibleToTransfer(income)).toBe(true);
    expect(isConvertibleToTransfer({ ...income, isRecurring: true })).toBe(false);
    expect(isConvertibleToTransfer({ ...income, type: "transfer" })).toBe(false);
  });

  it("trova la speculare sull'altro conto entro 3 giorni", () => {
    const candidates = [
      { ...base, id: "m1", type: "expense" as const, amount: 20000, date: "2026-11-10", accountId: "bank" },
      { ...base, id: "m2", type: "expense" as const, amount: 20000, date: "2026-11-20", accountId: "bank" },
      { ...base, id: "m3", type: "income" as const, amount: 20000, date: "2026-11-11", accountId: "bank" },
      { ...base, id: "m4", type: "expense" as const, amount: 19999, date: "2026-11-11", accountId: "bank" },
      { ...base, id: "m5", type: "expense" as const, amount: 20000, date: "2026-11-11", accountId: "other" },
      { ...base, id: "m6", type: "expense" as const, amount: 20000, date: "2026-11-11", accountId: "bank" },
    ];
    expect(findMirrorTransactions(income, "bank", candidates).map((t) => t.id)).toEqual(["m6", "m1"]);
  });
});
