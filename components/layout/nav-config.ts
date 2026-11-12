import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  PiggyBank,
  Vault,
  BarChart3,
  PieChart,
  Settings,
  DatabaseBackup,
  Shapes,
  UserCircle,
  type LucideIcon,
} from "lucide-react";

import type { MessageKey } from "@/lib/i18n/types";

export type NavItem = {
  href: string;
  labelKey: MessageKey;
  /** One-line description (used in the mobile "More" sheet). */
  descKey: MessageKey;
  icon: LucideIcon;
  /** Second key of the "G then <key>" keyboard shortcut. */
  shortcut: string;
};

export type NavGroup = {
  label: string;
  items: TranslatedNavItem[];
};

export type TranslatedNavItem = NavItem & { label: string; description: string };

export const DASHBOARD: NavItem = {
  href: "/",
  labelKey: "nav.dashboard",
  descKey: "nav.desc.dashboard",
  shortcut: "d",
  icon: LayoutDashboard,
};
export const TRANSACTIONS: NavItem = {
  href: "/transactions",
  labelKey: "nav.transactions",
  descKey: "nav.desc.transactions",
  shortcut: "t",
  icon: ArrowLeftRight,
};
export const ACCOUNTS: NavItem = {
  href: "/accounts",
  labelKey: "nav.accounts",
  descKey: "nav.desc.accounts",
  shortcut: "a",
  icon: Wallet,
};
export const BUDGET: NavItem = {
  href: "/budget",
  labelKey: "nav.budget",
  descKey: "nav.desc.budget",
  shortcut: "b",
  icon: PiggyBank,
};
export const PLANS: NavItem = {
  href: "/plans",
  labelKey: "nav.plans",
  descKey: "nav.desc.plans",
  shortcut: "p",
  icon: Vault,
};
export const REPORTS: NavItem = {
  href: "/reports",
  labelKey: "nav.reports",
  descKey: "nav.desc.reports",
  shortcut: "r",
  icon: BarChart3,
};
export const ALLOCATION: NavItem = {
  href: "/allocation",
  labelKey: "nav.allocation",
  descKey: "nav.desc.allocation",
  shortcut: "l",
  icon: PieChart,
};
export const CATEGORIES: NavItem = {
  href: "/categories",
  labelKey: "nav.categories",
  descKey: "nav.desc.categories",
  shortcut: "c",
  icon: Shapes,
};
export const BACKUP: NavItem = {
  href: "/data",
  labelKey: "nav.backup",
  descKey: "nav.desc.backup",
  shortcut: "e",
  icon: DatabaseBackup,
};
export const PROFILE: NavItem = {
  href: "/profile",
  labelKey: "nav.profile",
  descKey: "nav.desc.profile",
  shortcut: "u",
  icon: UserCircle,
};
export const SETTINGS: NavItem = {
  href: "/settings",
  labelKey: "nav.settings",
  descKey: "nav.desc.settings",
  shortcut: "s",
  icon: Settings,
};

export const bottomNavLeft: NavItem[] = [DASHBOARD, TRANSACTIONS];
export const bottomNavRight: NavItem[] = [ACCOUNTS];

export const moreNavItems: NavItem[] = [
  BUDGET,
  PLANS,
  REPORTS,
  ALLOCATION,
  CATEGORIES,
  BACKUP,
  PROFILE,
  SETTINGS,
];

/** Every destination, in sidebar order (command palette, shortcuts). */
export const allNavItems: NavItem[] = [
  DASHBOARD,
  TRANSACTIONS,
  ACCOUNTS,
  BUDGET,
  PLANS,
  REPORTS,
  ALLOCATION,
  CATEGORIES,
  BACKUP,
  PROFILE,
  SETTINGS,
];

export function isActivePath(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
