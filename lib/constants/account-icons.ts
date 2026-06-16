export const ACCOUNT_ICON_FALLBACK = "wallet" as const;

export const ACCOUNT_ICON_NAMES = [
  "wallet",
  "landmark",
  "credit-card",
  "piggy-bank",
  "building",
  "smartphone",
  "banknote",
  "receipt",
  "briefcase",
  "home",
  "car",
  "plane",
  "coffee",
  "shopping-bag",
  "sparkles",
  "wrench",
  "trending-up",
  "trending-down",
] as const;

export type AccountIconName = (typeof ACCOUNT_ICON_NAMES)[number];

export const KNOWN_ACCOUNT_ICONS = [
  ...ACCOUNT_ICON_NAMES,
  ACCOUNT_ICON_FALLBACK,
] as const;
