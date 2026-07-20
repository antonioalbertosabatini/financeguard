export function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase();
}

export function dedupeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const tag of tags) {
    const normalized = normalizeTag(tag);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

export function filterTagSuggestions(
  query: string,
  availableTags: string[],
  exclude: string[] = []
): string[] {
  const normalizedQuery = normalizeTag(query);
  const excluded = new Set(exclude.map(normalizeTag));
  return availableTags.filter((tag) => {
    const normalized = normalizeTag(tag);
    if (excluded.has(normalized)) return false;
    if (!normalizedQuery) return true;
    return normalized.includes(normalizedQuery);
  });
}

/** Collect unique normalized tags from transactions of any type (income/expense/transfer). */
export function collectTagsFromTransactions(
  transactions: Array<{ tags?: string[] }>,
  locale = "it-IT"
): string[] {
  const tags = new Set<string>();
  for (const tx of transactions) {
    for (const tag of tx.tags ?? []) {
      const normalized = normalizeTag(tag);
      if (normalized) tags.add(normalized);
    }
  }
  return Array.from(tags).sort((a, b) =>
    a.localeCompare(b, locale, { sensitivity: "base" })
  );
}

/** Union of tag lists, normalized and sorted. */
export function mergeTagLists(lists: string[][], locale = "it-IT"): string[] {
  const tags = new Set<string>();
  for (const list of lists) {
    for (const tag of list) {
      const normalized = normalizeTag(tag);
      if (normalized) tags.add(normalized);
    }
  }
  return Array.from(tags).sort((a, b) =>
    a.localeCompare(b, locale, { sensitivity: "base" })
  );
}
