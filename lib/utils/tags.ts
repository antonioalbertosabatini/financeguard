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
