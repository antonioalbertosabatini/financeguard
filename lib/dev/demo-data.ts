/**
 * DEV ONLY — fills an unlocked vault with realistic demo data so the UI can be
 * reviewed (and smoke-tested by Playwright) with something on screen.
 * Exposed as `window.__fgSeedDemo()` by <StoreBootstrap> in development builds.
 */
import { createAccount, getAccounts } from "@/lib/actions/accounts";
import { upsertBudget } from "@/lib/actions/budgets";
import { getCategories } from "@/lib/actions/categories";
import { createTransaction } from "@/lib/actions/transactions";
import type { Category } from "@/lib/schemas/category";
import { persistNow } from "@/lib/storage/data-store";

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Deterministic pseudo-random so every seed looks the same. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export async function seedDemoData(): Promise<string> {
  const existing = await getAccounts();
  if (existing.length > 0) return "Vault già popolato: seed saltato.";

  await createAccount({ name: "Conto corrente", type: "checking", initialBalance: 820000, currency: "EUR", icon: "landmark" });
  await createAccount({ name: "Carta di credito", type: "credit_card", initialBalance: 0, currency: "EUR", icon: "credit-card" });
  await createAccount({ name: "Contanti", type: "cash", initialBalance: 15000, currency: "EUR", icon: "wallet" });
  const accounts = await getAccounts();
  const checking = accounts.find((a) => a.type === "checking")!;
  const card = accounts.find((a) => a.type === "credit_card")!;
  const cash = accounts.find((a) => a.type === "cash")!;

  const categories = await getCategories();
  const byName = (name: string, type: Category["type"]) =>
    categories.find((c) => c.type === type && c.name.toLowerCase().includes(name)) ??
    categories.find((c) => c.type === type)!;

  const salary = byName("stipendio", "income");
  const spesa = byName("spesa", "expense");
  const ristoranti = byName("ristoranti", "expense");
  const bollette = byName("bollette", "expense");
  const trasporti = byName("trasporti", "expense");
  const svago = byName("svago", "expense");
  const affitto = byName("affitto", "expense");

  const now = new Date();
  const year = now.getFullYear();
  const lastMonth = now.getMonth() + 1;
  const rand = seeded(42);

  for (let month = 1; month <= lastMonth; month++) {
    const maxDay = month === lastMonth ? now.getDate() : 28;
    const add = async (
      day: number,
      type: "income" | "expense",
      category: Category,
      euros: number,
      notes: string,
      accountId = card.id,
      tags: string[] = []
    ) => {
      if (day > maxDay) return;
      await createTransaction({
        date: isoDate(year, month, day),
        amount: Math.round(euros * 100),
        type,
        categoryId: category.id,
        accountId,
        notes,
        tags,
        isRecurring: false,
      });
    };

    await add(1, "income", salary, 2450 + Math.round(rand() * 150), "Stipendio", checking.id);
    await add(2, "expense", affitto, 750, "Affitto", checking.id);
    await add(5, "expense", spesa, 60 + rand() * 40, "Esselunga", card.id, ["casa"]);
    await add(9, "expense", bollette, 70 + rand() * 50, "Enel Energia", checking.id);
    await add(12, "expense", ristoranti, 25 + rand() * 40, "Trattoria Da Mario");
    await add(14, "expense", trasporti, 40 + rand() * 25, "Distributore Q8", card.id, ["auto"]);
    await add(18, "expense", spesa, 45 + rand() * 50, "Coop", card.id, ["casa"]);
    await add(20, "expense", svago, 12.99, "Abbonamento streaming");
    await add(22, "expense", ristoranti, 8 + rand() * 10, "Bar Centrale", cash.id);
    await add(25, "expense", spesa, 30 + rand() * 30, "Mercato", cash.id);
    await add(27, "expense", ristoranti, 30 + rand() * 50, "Pizzeria", card.id, ["amici"]);
  }

  // Long bank-statement descriptions (like Trade Republic imports) to exercise
  // truncation and narrow layouts.
  const today = isoDate(year, lastMonth, now.getDate());
  for (const notes of [
    "Kartentransaktion ESSELUNGA SPA SUPERMERCATO VIA ROMA 123 MILANO IT carta ****4821",
    "Pagamento POS AUTOSTRADE PER L'ITALIA SPA CASELLO MILANO SUD BARRIERA TERMINALE 0042",
  ]) {
    await createTransaction({
      date: today,
      amount: 4790,
      type: "expense",
      categoryId: spesa.id,
      accountId: card.id,
      notes,
      tags: ["casa"],
      isRecurring: false,
    });
  }

  await upsertBudget({ name: ristoranti.name, categoryId: ristoranti.id, icon: ristoranti.icon, monthlyLimit: 9000 });
  await upsertBudget({
    name: "Spesa casa, supermercati e negozi del quartiere",
    tag: "casa",
    icon: spesa.icon,
    monthlyLimit: 5000,
  });
  await upsertBudget({ name: spesa.name, categoryId: spesa.id, icon: spesa.icon, monthlyLimit: 30000 });
  await upsertBudget({ name: trasporti.name, categoryId: trasporti.id, icon: trasporti.icon, monthlyLimit: 4000 });

  // commit() saves with a 250ms debounce: flush now so a reload right after
  // seeding (e.g. in the e2e tests) does not lose the last writes.
  await persistNow();
  return "Dati demo creati.";
}
