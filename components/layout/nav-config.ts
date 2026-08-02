import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  PiggyBank,
  BarChart3,
  Settings,
  DatabaseBackup,
  Shapes,
  TrendingUp,
  UserCircle,
  type LucideIcon,
} from "lucide-react";

import type { MessageKey } from "@/lib/i18n/types";

export type NavItem = {
  href: string;
  labelKey: MessageKey;
  icon: LucideIcon;
};

export type NavGroup = {
  label: string;
  items: (NavItem & { label: string })[];
};

export type TranslatedNavItem = NavItem & { label: string };

export const DASHBOARD: NavItem = {
  href: "/",
  labelKey: "nav.dashboard",
  icon: LayoutDashboard,
};
export const TRANSACTIONS: NavItem = {
  href: "/transactions",
  labelKey: "nav.transactions",
  icon: ArrowLeftRight,
};
export const ACCOUNTS: NavItem = {
  href: "/accounts",
  labelKey: "nav.accounts",
  icon: Wallet,
};
export const INVESTMENTS: NavItem = {
  href: "/investments",
  labelKey: "nav.investments",
  icon: TrendingUp,
};
export const BUDGET: NavItem = {
  href: "/budget",
  labelKey: "nav.budget",
  icon: PiggyBank,
};
export const REPORTS: NavItem = {
  href: "/reports",
  labelKey: "nav.reports",
  icon: BarChart3,
};
export const CATEGORIES: NavItem = {
  href: "/categories",
  labelKey: "nav.categories",
  icon: Shapes,
};
export const BACKUP: NavItem = {
  href: "/data",
  labelKey: "nav.backup",
  icon: DatabaseBackup,
};
export const PROFILE: NavItem = {
  href: "/profile",
  labelKey: "nav.profile",
  icon: UserCircle,
};
export const SETTINGS: NavItem = {
  href: "/settings",
  labelKey: "nav.settings",
  icon: Settings,
};

export const bottomNavLeft: NavItem[] = [DASHBOARD, TRANSACTIONS];
export const bottomNavRight: NavItem[] = [ACCOUNTS];

export const moreNavItems: NavItem[] = [
  INVESTMENTS,
  BUDGET,
  REPORTS,
  CATEGORIES,
  BACKUP,
  PROFILE,
  SETTINGS,
];

export function isActivePath(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
