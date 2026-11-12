import { describe, expect, it } from "vitest";
import { normalizeDate, parseAmountToCents } from "@/lib/import/amount";

describe("parseAmountToCents", () => {
  it.each([
    ["-89.790000", -8979],
    ["200.000000", 20000],
    ["-10.00", -1000],
    ["200", 20000],
    ["1.234,56", 123456],
    ["1,234.56", 123456],
    ["-5,00 €", -500],
    ["0.005", 1],
    ["-0.004", 0],
    ["(12.50)", -1250],
  ])("%s → %d", (input, expected) => {
    expect(parseAmountToCents(input)).toBe(expected);
  });

  it("rifiuta valori non numerici", () => {
    expect(parseAmountToCents("")).toBeNull();
    expect(parseAmountToCents("abc")).toBeNull();
  });
});

describe("normalizeDate", () => {
  it("accetta ISO, datetime e formati europei", () => {
    expect(normalizeDate("2026-11-09")).toBe("2026-11-09");
    expect(normalizeDate("2026-11-09T14:55:35.910Z")).toBe("2026-11-09");
    expect(normalizeDate("9/11/2026")).toBe("2026-11-09");
    expect(normalizeDate("09.11.2026")).toBe("2026-11-09");
  });

  it("rifiuta date inesistenti", () => {
    expect(normalizeDate("2026-02-30")).toBeNull();
    expect(normalizeDate("ieri")).toBeNull();
  });
});
