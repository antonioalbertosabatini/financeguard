import { describe, expect, it } from "vitest";
import { emptyDataset, normalizeDataset } from "@/lib/storage/dataset";

describe("normalizeDataset", () => {
  it("conserva l'ISIN dei piani di accumulo", () => {
    const dataset = emptyDataset();
    dataset.accumulationPlans = [
      { id: "pac_1", name: "MSCI World", isin: "IE00B4L5Y983", oneTimeContributions: [] },
      { id: "pac_2", name: "Senza ISIN", oneTimeContributions: [] },
    ];
    const normalized = normalizeDataset(dataset);
    expect(normalized.accumulationPlans[0].isin).toBe("IE00B4L5Y983");
    expect("isin" in normalized.accumulationPlans[1]).toBe(false);
  });
});
