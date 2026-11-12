"use client";

import { useMemo, useState } from "react";
import { UNCATEGORIZED_CATEGORY_ID } from "@/lib/constants";
import type { Account } from "@/lib/schemas/account";
import type { Category } from "@/lib/schemas/category";
import type { Transaction } from "@/lib/schemas/transaction";
import { formatDate } from "@/lib/utils/dates";
import { formatCents, toCents } from "@/lib/utils/money";
import {
  countActiveUiFilters,
  type MatchMode,
  type UiTransactionFilters,
} from "@/lib/utils/transaction-filters";
import { useI18n } from "@/providers/i18n-provider";

function euroFilterToCents(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const cents = toCents(trimmed);
  return cents > 0 ? cents : null;
}

export interface ActiveFilterChip {
  key: string;
  label: string;
  onRemove: () => void;
}

/**
 * All filter state of the transactions page in one place, plus the list of
 * active-filter chips generated from it (instead of hand-written badges).
 */
export function useTransactionFilters({
  accounts,
  categories,
  currency,
  locale,
}: {
  accounts: Account[];
  categories: Category[];
  currency: string;
  locale: string;
}) {
  const { t, language } = useI18n();
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [accountIds, setAccountIds] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagsMatch, setTagsMatch] = useState<MatchMode>("any");
  const [amountMinEuro, setAmountMinEuro] = useState("");
  const [amountMaxEuro, setAmountMaxEuro] = useState("");

  const filterState = useMemo(
    (): UiTransactionFilters => ({
      dateFrom,
      dateTo,
      categoryIds,
      accountIds,
      types,
      tags,
      tagsMatch,
      amountMinCents: euroFilterToCents(amountMinEuro),
      amountMaxCents: euroFilterToCents(amountMaxEuro),
    }),
    [dateFrom, dateTo, categoryIds, accountIds, types, tags, tagsMatch, amountMinEuro, amountMaxEuro]
  );

  const amountRangeInvalid =
    filterState.amountMinCents !== null &&
    filterState.amountMaxCents !== null &&
    filterState.amountMinCents > filterState.amountMaxCents;

  const activeFilterCount = countActiveUiFilters(filterState);

  function clearFilters() {
    setDateFrom("");
    setDateTo("");
    setCategoryIds([]);
    setAccountIds([]);
    setTypes([]);
    setTags([]);
    setTagsMatch("any");
    setAmountMinEuro("");
    setAmountMaxEuro("");
  }

  const chips = useMemo((): ActiveFilterChip[] => {
    const categoryName = (id: string) =>
      id === UNCATEGORIZED_CATEGORY_ID
        ? t("transactions.uncategorized")
        : categories.find((c) => c.id === id)?.name ?? id;
    const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? id;
    const money = (cents: number) => formatCents(cents, currency, locale);
    const date = (iso: string) => formatDate(iso, "dd/MM/yyyy", language);

    const list: ActiveFilterChip[] = [];
    if (dateFrom)
      list.push({ key: "from", label: t("transactions.filterChipFrom", { date: date(dateFrom) }), onRemove: () => setDateFrom("") });
    if (dateTo)
      list.push({ key: "to", label: t("transactions.filterChipTo", { date: date(dateTo) }), onRemove: () => setDateTo("") });
    for (const id of categoryIds)
      list.push({
        key: `cat-${id}`,
        label: t("transactions.filterChipCategory", { name: categoryName(id) }),
        onRemove: () => setCategoryIds((prev) => prev.filter((x) => x !== id)),
      });
    for (const id of accountIds)
      list.push({
        key: `acc-${id}`,
        label: t("transactions.filterChipAccount", { name: accountName(id) }),
        onRemove: () => setAccountIds((prev) => prev.filter((x) => x !== id)),
      });
    for (const type of types)
      list.push({
        key: `type-${type}`,
        label: t("transactions.filterChipType", {
          type: t(`labels.transactionType.${type as Transaction["type"]}`),
        }),
        onRemove: () => setTypes((prev) => prev.filter((x) => x !== type)),
      });
    for (const tag of tags)
      list.push({
        key: `tag-${tag}`,
        label: t("transactions.filterChipTag", { tag }),
        onRemove: () => setTags((prev) => prev.filter((x) => x !== tag)),
      });
    if (tags.length > 0 && tagsMatch === "all")
      list.push({ key: "tags-all", label: t("transactions.filterChipTagsAll"), onRemove: () => setTagsMatch("any") });

    const { amountMinCents: min, amountMaxCents: max } = filterState;
    if (min !== null && max !== null) {
      list.push({
        key: "amount",
        label: t("transactions.filterChipAmountRange", { min: money(min), max: money(max) }),
        onRemove: () => {
          setAmountMinEuro("");
          setAmountMaxEuro("");
        },
      });
    } else if (min !== null) {
      list.push({ key: "amount-min", label: t("transactions.filterChipAmountMin", { amount: money(min) }), onRemove: () => setAmountMinEuro("") });
    } else if (max !== null) {
      list.push({ key: "amount-max", label: t("transactions.filterChipAmountMax", { amount: money(max) }), onRemove: () => setAmountMaxEuro("") });
    }
    return list;
  }, [t, language, categories, accounts, currency, locale, dateFrom, dateTo, categoryIds, accountIds, types, tags, tagsMatch, filterState]);

  return {
    search,
    setSearch,
    filterState,
    amountRangeInvalid,
    activeFilterCount,
    chips,
    clearFilters,
    fields: {
      dateFrom,
      setDateFrom,
      dateTo,
      setDateTo,
      categoryIds,
      setCategoryIds,
      accountIds,
      setAccountIds,
      types,
      setTypes,
      tags,
      setTags,
      tagsMatch,
      setTagsMatch,
      amountMinEuro,
      setAmountMinEuro,
      amountMaxEuro,
      setAmountMaxEuro,
    },
  };
}

export type TransactionFiltersState = ReturnType<typeof useTransactionFilters>;
