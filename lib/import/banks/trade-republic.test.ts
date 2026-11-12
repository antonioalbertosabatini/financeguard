import { describe, expect, it } from "vitest";
import { parseTradeRepublic } from "@/lib/import/banks/trade-republic";
import { parseCsv } from "@/lib/import/csv";
import {
  TRADE_REPUBLIC_HEADER,
  TRADE_REPUBLIC_SAMPLE,
} from "@/lib/import/__fixtures__/trade-republic";
import { AppError } from "@/lib/i18n/app-error";

function parse(text: string) {
  return parseTradeRepublic(parseCsv(text));
}

describe("parseTradeRepublic", () => {
  const rows = parse(TRADE_REPUBLIC_SAMPLE);

  it("legge tutte le righe del file", () => {
    expect(rows).toHaveLength(10);
  });

  it("riconosce i versamenti del piano di accumulo", () => {
    const pac = rows.filter((row) => row.kind === "pacContribution");
    expect(pac).toHaveLength(2);
    expect(pac[0]).toMatchObject({
      date: "2026-11-09",
      amount: 1000,
      planName: "Core MSCI World USD (Acc)",
      isin: "IE00B4L5Y983",
      externalId: "tr:efa2aec5-8f00-4fa4-b35d-de2d0cc5e254",
    });
    expect(pac[1]).toMatchObject({ amount: 500, isin: "IE00BK5BQT80" });
  });

  it("mappa le spese con carta come uscite con la descrizione come nota", () => {
    const volotea = rows.find((row) => row.notes === "VOLOTEA S.A QBYY3T");
    expect(volotea).toMatchObject({
      kind: "transaction",
      type: "expense",
      amount: 8979,
      date: "2026-11-11",
      uncertain: false,
    });
    const expenses = rows.filter(
      (row) => row.kind === "transaction" && row.type === "expense"
    );
    expect(expenses).toHaveLength(7);
  });

  it("mappa il bonifico in ingresso come entrata", () => {
    const income = rows.filter(
      (row) => row.kind === "transaction" && row.type === "income"
    );
    expect(income).toHaveLength(1);
    expect(income[0]).toMatchObject({
      amount: 20000,
      sourceType: "TRANSFER_INSTANT_INBOUND",
      notes: expect.stringContaining("Incoming transfer"),
    });
  });

  it("salta le compravendite manuali e segnala i tipi sconosciuti", () => {
    const extra = parse(
      [
        TRADE_REPUBLIC_HEADER,
        "2026-11-12T10:00:00Z,2026-11-12,DEFAULT,TRADING,BUY,STOCK,Apple,US0378331005,1,200,-200.00,-1.00,,EUR,,,,Buy trade US0378331005 Apple,id-1,,,,",
        "2026-11-12T10:00:00Z,2026-11-12,DEFAULT,TRADING,SELL,STOCK,Apple,US0378331005,1,210,210.00,-1.00,,EUR,,,,Sell trade,id-2,,,,",
        "2026-11-12T10:00:00Z,2026-11-12,DEFAULT,CASH,INTEREST_PAYMENT,,,,,,3.21,,,EUR,,,,Interest,id-3,,,,",
        "2026-11-12T10:00:00Z,2026-11-12,DEFAULT,CASH,SOMETHING_NEW,,,,,,-1.50,,,EUR,,,,Mistero,id-4,,,,",
        "2026-11-12T10:00:00Z,2026-11-12,DEFAULT,TRADING,BUY,FUND,MSCI EM,IE00BKM4GZ66,0.1,30,-25.00,-1.00,,EUR,,,,Savings plan execution IE00BKM4GZ66,id-5,,,,",
      ].join("\n")
    );
    expect(extra.map((row) => row.kind)).toEqual([
      "skipped",
      "skipped",
      "transaction",
      "transaction",
      "pacContribution",
    ]);
    expect(extra[0]).toMatchObject({ reason: "unsupportedTrade" });
    expect(extra[2]).toMatchObject({ type: "income", amount: 321, uncertain: false });
    expect(extra[3]).toMatchObject({ type: "expense", amount: 150, uncertain: true });
    // Importo PAC = importo + commissioni (uscita reale dal conto)
    expect(extra[4]).toMatchObject({ amount: 2600 });
  });

  it("rifiuta file di un'altra banca", () => {
    expect(() => parse("Data;Importo;Descrizione\n01/01/2026;-5;x")).toThrow(AppError);
  });
});
