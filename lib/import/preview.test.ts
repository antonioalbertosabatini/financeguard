import { describe, expect, it } from "vitest";
import { parseTradeRepublic } from "@/lib/import/banks/trade-republic";
import { parseCsv } from "@/lib/import/csv";
import { TRADE_REPUBLIC_SAMPLE } from "@/lib/import/__fixtures__/trade-republic";
import {
  buildImportPreview,
  collectExternalIds,
  fileDateRange,
  isSelectableByDefault,
  matchPlan,
} from "@/lib/import/preview";

const rows = parseTradeRepublic(parseCsv(TRADE_REPUBLIC_SAMPLE));

describe("buildImportPreview", () => {
  it("filtra per periodo", () => {
    expect(fileDateRange(rows)).toEqual({ from: "2026-11-09", to: "2026-11-11" });
    const preview = buildImportPreview({
      rows,
      dateFrom: "2026-11-10",
      dateTo: "2026-11-10",
      existingExternalIds: new Set(),
      plans: [],
    });
    expect(preview.rows).toHaveLength(2);
    expect(preview.outOfPeriod).toBe(8);
  });

  it("marca come duplicati gli id gia' presenti (anche se convertiti in trasferimento)", () => {
    const existing = collectExternalIds({
      transactions: [{ externalId: "tr:01a1c53b-3b82-78aa-b207-c41aabde5555" }],
      transfers: [{ externalIds: ["tr:01a1cb59-bc12-72e6-9c06-3c7338bec456"] }],
      plans: [
        { oneTimeContributions: [{ externalId: "tr:efa2aec5-8f00-4fa4-b35d-de2d0cc5e254" }] },
      ],
    });
    const preview = buildImportPreview({ rows, existingExternalIds: existing, plans: [] });
    const duplicates = preview.rows.filter((row) => row.status === "duplicate");
    expect(duplicates).toHaveLength(3);
    expect(preview.rows.filter(isSelectableByDefault)).toHaveLength(7);
  });

  it("abbina i piani per ISIN, poi per nome, altrimenti ne propone uno nuovo", () => {
    const plans = [
      { id: "pac_a", name: "MSCI World", isin: "IE00B4L5Y983" },
      { id: "pac_b", name: "ftse all-world usd (acc)" },
    ];
    const preview = buildImportPreview({ rows, existingExternalIds: new Set(), plans });
    const targets = preview.rows.flatMap((row) => ("planTarget" in row ? [row.planTarget] : []));
    expect(targets).toEqual(
      expect.arrayContaining([
        { kind: "existing", planId: "pac_a" },
        { kind: "existing", planId: "pac_b" },
      ])
    );

    const fresh = buildImportPreview({ rows, existingExternalIds: new Set(), plans: [] });
    const newTargets = fresh.rows.flatMap((row) => ("planTarget" in row ? [row.planTarget] : []));
    expect(newTargets).toContainEqual({
      kind: "new",
      name: "Core MSCI World USD (Acc)",
      isin: "IE00B4L5Y983",
    });
  });

  it("matchPlan ignora maiuscole e spazi", () => {
    expect(matchPlan([{ id: "x", name: "  Core  MSCI World " }], "core msci world")?.id).toBe("x");
  });
});
