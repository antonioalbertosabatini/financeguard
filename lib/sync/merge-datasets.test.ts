import { describe, expect, it } from "vitest";
import { emptyDataset } from "@/lib/storage/dataset";
import { mergeDatasets } from "@/lib/sync/merge-datasets";
import {
  recordKey,
  trackDelete,
  trackUpsert,
} from "@/lib/sync/sync-metadata";
import type { Account } from "@/lib/schemas/account";

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
