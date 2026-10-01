import { sortAccounts } from "@/lib/schemas/account";
import type { Dataset } from "@/lib/storage/dataset";
import type { QuickAddCatalogPayload } from "@/lib/native/quick-add-plugin";

export function buildQuickAddCatalog(dataset: Dataset): QuickAddCatalogPayload {
  const accounts = sortAccounts(dataset.accounts).map((account) => ({
    id: account.id,
    name: account.name,
    type: account.type,
    icon: account.icon,
  }));
  const categories = dataset.categories.map((category) => ({
    id: category.id,
    name: category.name,
    type: category.type,
    icon: category.icon,
  }));
  const expense = categories.find((category) => category.type === "expense");
  const income = categories.find((category) => category.type === "income");
  return {
    accounts,
    categories,
    language: dataset.settings.language,
    defaultCurrency: dataset.settings.defaultCurrency,
    defaults: {
      accountId: accounts[0]?.id ?? "",
      expenseCategoryId: expense?.id ?? "",
      incomeCategoryId: income?.id ?? "",
    },
  };
}
