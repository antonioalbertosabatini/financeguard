import { describe, expect, it } from "vitest";
import { emptyDataset } from "@/lib/storage/dataset";
import { mergeDatasets } from "@/lib/sync/merge-datasets";
import {
  recordKey,
  trackDelete,
  trackUpsert,
} from "@/lib/sync/sync-metadata";
import type { Account } from "@/lib/schemas/account";
import type { Instrument } from "@/lib/schemas/instrument";
import type { Trade } from "@/lib/schemas/trade";

function makeAccount(id: string, name: string): Account {
  return {
    id,
    name,
    type: "checking",
    initialBalance: 0,
    currency: "EUR",
    icon: "wallet",
  };
}

describe("mergeDatasets", () => {
  it("keeps newer field value from remote", () => {
    const local = emptyDataset();
    const remote = emptyDataset();
    const account = makeAccount("acc_1", "Locale");
    local.accounts = [account];
    remote.accounts = [{ ...account, name: "Remoto" }];

    const at = "2026-01-01T10:00:00.000Z";
    const later = "2026-01-02T10:00:00.000Z";
    const key = recordKey("account", "acc_1");

    local.syncMeta!.records[key] = {
      updatedAt: at,
      deviceId: "dev-a",
      fields: {
        name: { updatedAt: at, deviceId: "dev-a" },
      },
    };
    remote.syncMeta!.records[key] = {
      updatedAt: later,
      deviceId: "dev-b",
      fields: {
        name: { updatedAt: later, deviceId: "dev-b" },
      },
    };

    const merged = mergeDatasets(local, remote);
    expect(merged.accounts[0].name).toBe("Remoto");
  });

  it("applies delete when tombstone is newer", () => {
    const local = emptyDataset();
    const remote = emptyDataset();
    const account = makeAccount("acc_2", "Test");
    local.accounts = [account];
    remote.accounts = [];

    const deletedAt = "2026-01-03T10:00:00.000Z";
    const updatedAt = "2026-01-01T10:00:00.000Z";
    const key = recordKey("account", "acc_2");

    local.syncMeta!.records[key] = {
      updatedAt: updatedAt,
      deviceId: "dev-a",
      fields: { name: { updatedAt: updatedAt, deviceId: "dev-a" } },
    };
    remote.syncMeta!.records[key] = {
      updatedAt: deletedAt,
      deviceId: "dev-b",
      deletedAt,
      fields: {},
    };

    const merged = mergeDatasets(local, remote);
    expect(merged.accounts).toHaveLength(0);
  });

  it("restores record when local edit is newer than remote delete", () => {
    const local = emptyDataset();
    const remote = emptyDataset();
    const account = makeAccount("acc_3", "Aggiornato");
    local.accounts = [account];
    remote.accounts = [];

    const deletedAt = "2026-01-01T10:00:00.000Z";
    const updatedAt = "2026-01-03T10:00:00.000Z";
    const key = recordKey("account", "acc_3");

    local.syncMeta!.records[key] = {
      updatedAt: updatedAt,
      deviceId: "dev-a",
      fields: { name: { updatedAt: updatedAt, deviceId: "dev-a" } },
    };
    remote.syncMeta!.records[key] = {
      updatedAt: deletedAt,
      deviceId: "dev-b",
      deletedAt,
      fields: {},
    };

    const merged = mergeDatasets(local, remote);
    expect(merged.accounts).toHaveLength(1);
    expect(merged.accounts[0].name).toBe("Aggiornato");
  });
});

describe("mergeDatasets con investimenti", () => {
  const instrument: Instrument = {
    id: "ins_1",
    symbol: "SWDA.MI",
    ticker: "SWDA",
    name: "iShares Core MSCI World",
    kind: "etf",
    currency: "EUR",
    exchange: "MIL",
    isin: "",
    manualPrice8: null,
    manualPriceAt: null,
  };

  function makeTrade(id: string, date: string, cashCents: number): Trade {
    return {
      id,
      instrumentId: instrument.id,
      date,
      side: "buy",
      quantity8: 100_000_000,
      price8: 10_000_000_000,
      feesCents: 0,
      cashCents,
      accountId: "acc_1",
      notes: "",
    };
  }

  it("unisce operazioni di anni diversi provenienti dai due dispositivi", () => {
    const local = emptyDataset();
    const remote = emptyDataset();
    local.instruments = [instrument];
    remote.instruments = [instrument];
    local.tradesByYear["2025"] = [makeTrade("trd_1", "2025-06-01", 10_000)];
    remote.tradesByYear["2026"] = [makeTrade("trd_2", "2026-06-01", 20_000)];

    const at = "2026-07-01T10:00:00.000Z";
    for (const [dataset, key] of [
      [local, recordKey("trade", "trd_1")],
      [remote, recordKey("trade", "trd_2")],
    ] as const) {
      dataset.syncMeta!.records[key] = {
        updatedAt: at,
        deviceId: "dev",
        fields: {},
      };
    }

    const merged = mergeDatasets(local, remote);

    expect(merged.tradesByYear["2025"]).toHaveLength(1);
    expect(merged.tradesByYear["2026"]).toHaveLength(1);
    expect(merged.instruments).toHaveLength(1);
  });

  it("tiene il prezzo manuale scritto piu' di recente", () => {
    const local = emptyDataset();
    const remote = emptyDataset();
    local.instruments = [{ ...instrument, manualPrice8: 100_000_000 }];
    remote.instruments = [{ ...instrument, manualPrice8: 200_000_000 }];

    const older = "2026-01-01T10:00:00.000Z";
    const newer = "2026-02-01T10:00:00.000Z";
    const key = recordKey("instrument", instrument.id);

    local.syncMeta!.records[key] = {
      updatedAt: older,
      deviceId: "dev-a",
      fields: { manualPrice8: { updatedAt: older, deviceId: "dev-a" } },
    };
    remote.syncMeta!.records[key] = {
      updatedAt: newer,
      deviceId: "dev-b",
      fields: { manualPrice8: { updatedAt: newer, deviceId: "dev-b" } },
    };

    const merged = mergeDatasets(local, remote);
    expect(merged.instruments[0].manualPrice8).toBe(200_000_000);
  });

  it("rimuove l'operazione eliminata sull'altro dispositivo", () => {
    const local = emptyDataset();
    const remote = emptyDataset();
    local.tradesByYear["2026"] = [makeTrade("trd_3", "2026-03-01", 10_000)];

    const updatedAt = "2026-03-01T10:00:00.000Z";
    const deletedAt = "2026-04-01T10:00:00.000Z";
    const key = recordKey("trade", "trd_3");

    local.syncMeta!.records[key] = {
      updatedAt,
      deviceId: "dev-a",
      fields: {},
    };
    remote.syncMeta!.records[key] = {
      updatedAt: deletedAt,
      deviceId: "dev-b",
      deletedAt,
      fields: {},
    };

    const merged = mergeDatasets(local, remote);
    expect(merged.tradesByYear["2026"] ?? []).toHaveLength(0);
  });
});

describe("sync metadata", () => {
  it("tracks field-level updates", () => {
    const dataset = emptyDataset();
    const account = makeAccount("acc_4", "Prima");
    trackUpsert(
      dataset,
      "account",
      account.id,
      account as unknown as Record<string, unknown>,
      "dev-1"
    );
    trackUpsert(
      dataset,
      "account",
      account.id,
      { ...account, name: "Dopo" } as unknown as Record<string, unknown>,
      "dev-1",
      account as unknown as Record<string, unknown>
    );

    const key = recordKey("account", "acc_4");
    const meta = dataset.syncMeta!.records[key];
    expect(meta.fields.name).toBeDefined();
    expect(meta.deletedAt).toBeUndefined();
  });

  it("creates tombstone on delete", () => {
    const dataset = emptyDataset();
    trackDelete(dataset, "account", "acc_5", "dev-1");
    const key = recordKey("account", "acc_5");
    expect(dataset.syncMeta!.records[key].deletedAt).toBeDefined();
  });
});
