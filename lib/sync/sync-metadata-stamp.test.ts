import { describe, expect, it } from "vitest";
import { emptyDataset } from "@/lib/storage/dataset";
import type { Account } from "@/lib/schemas/account";
import {
  recordKey,
  stampDatasetAsAuthoritative,
} from "@/lib/sync/sync-metadata";

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

describe("stampDatasetAsAuthoritative", () => {
  it("stamps every entity with a fresh timestamp", () => {
    const dataset = emptyDataset();
    dataset.accounts = [makeAccount("acc_1", "Conto")];
    dataset.syncMeta = {
      version: 1,
      migratedAt: "2020-01-01T00:00:00.000Z",
      records: {
        [recordKey("account", "acc_1")]: {
          updatedAt: "2020-01-01T00:00:00.000Z",
          deviceId: "old-device",
          fields: {
            name: {
              updatedAt: "2020-01-01T00:00:00.000Z",
              deviceId: "old-device",
            },
          },
        },
      },
    };

    const before = Date.now();
    stampDatasetAsAuthoritative(dataset, "dev-new");
    const after = Date.now();

    const accountMeta = dataset.syncMeta!.records[recordKey("account", "acc_1")];
    expect(accountMeta).toBeDefined();
    expect(accountMeta.deviceId).toBe("dev-new");
    expect(accountMeta.fields.name?.deviceId).toBe("dev-new");

    const stampedAt = Date.parse(accountMeta.updatedAt);
    expect(stampedAt).toBeGreaterThanOrEqual(before);
    expect(stampedAt).toBeLessThanOrEqual(after);

    const settingsMeta =
      dataset.syncMeta!.records[recordKey("settings", "settings")];
    expect(settingsMeta).toBeDefined();
    expect(settingsMeta.deviceId).toBe("dev-new");
    expect(dataset.syncMeta!.migratedAt).toBe(accountMeta.updatedAt);
  });

  it("replaces previous syncMeta instead of merging old records", () => {
    const dataset = emptyDataset();
    dataset.accounts = [makeAccount("acc_keep", "Keep")];
    dataset.syncMeta = {
      version: 1,
      records: {
        [recordKey("account", "acc_gone")]: {
          updatedAt: "2020-01-01T00:00:00.000Z",
          deviceId: "old",
          deletedAt: "2020-01-02T00:00:00.000Z",
          fields: {},
        },
      },
    };

    stampDatasetAsAuthoritative(dataset, "dev-a");

    expect(
      dataset.syncMeta!.records[recordKey("account", "acc_gone")]
    ).toBeUndefined();
    expect(
      dataset.syncMeta!.records[recordKey("account", "acc_keep")]
    ).toBeDefined();
  });
});
