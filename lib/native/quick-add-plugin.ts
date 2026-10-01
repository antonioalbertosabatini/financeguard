import { registerPlugin } from "@capacitor/core";

export type QuickAddPendingItem = {
  id: string;
  amount: number;
  type: "income" | "expense";
  categoryId: string;
  accountId: string;
  date: string;
};

export type QuickAddCatalogPayload = {
  accounts: Array<{ id: string; name: string; type: string; icon: string }>;
  categories: Array<{ id: string; name: string; type: string; icon: string; color: string }>;
  language: "it" | "en";
  defaultCurrency: string;
  defaults: {
    accountId: string;
    expenseCategoryId: string;
    incomeCategoryId: string;
  };
};

export interface QuickAddPlugin {
  isAvailable(): Promise<{ value: boolean }>;
  isEnabled(): Promise<{ value: boolean }>;
  enable(): Promise<void>;
  disable(): Promise<void>;
  setCatalog(options: { catalogJson: string }): Promise<void>;
  drainPending(): Promise<{ items: QuickAddPendingItem[] }>;
  clearPending(options: { ids: string[] }): Promise<void>;
}

const unimplemented: QuickAddPlugin = {
  async isAvailable() {
    return { value: false };
  },
  async isEnabled() {
    return { value: false };
  },
  async enable() {
    throw new Error("Quick add is only available on Android");
  },
  async disable() {
    return;
  },
  async setCatalog() {
    return;
  },
  async drainPending() {
    return { items: [] };
  },
  async clearPending() {
    return;
  },
};

export const QuickAdd = registerPlugin<QuickAddPlugin>("QuickAdd", {
  web: unimplemented,
  ios: unimplemented,
});
