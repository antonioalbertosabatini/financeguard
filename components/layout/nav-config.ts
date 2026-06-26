import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  PiggyBank,
  BarChart3,
  Settings,
  DatabaseBackup,
  Shapes,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const DASHBOARD: NavItem = {
  href: "/",
  label: "Dashboard",
  icon: LayoutDashboard,
};
export const TRANSACTIONS: NavItem = {
  href: "/transactions",
  label: "Transazioni",
  icon: ArrowLeftRight,
};
export const ACCOUNTS: NavItem = {
  href: "/accounts",
  label: "Conti",
  icon: Wallet,
};
export const BUDGET: NavItem = {
  href: "/budget",
  label: "Budget",
  icon: PiggyBank,
};
export const REPORTS: NavItem = {
  href: "/reports",
  label: "Report",
  icon: BarChart3,
};
export const CATEGORIES: NavItem = {
  href: "/categories",
  label: "Categorie",
  icon: Shapes,
};
export const BACKUP: NavItem = {
  href: "/data",
  label: "Backup",
  icon: DatabaseBackup,
};
export const SETTINGS: NavItem = {
  href: "/settings",
  label: "Impostazioni",
  icon: Settings,
};

/** Grouped navigation used by the desktop sidebar (full set). */
export const navGroups: NavGroup[] = [
  { label: "Principale", items: [DASHBOARD] },
  { label: "Gestione", items: [TRANSACTIONS, ACCOUNTS, BUDGET, REPORTS, CATEGORIES] },
  { label: "Sistema", items: [BACKUP, SETTINGS] },
];

/** Primary destinations shown directly in the mobile bottom bar (around the FAB). */
export const bottomNavLeft: NavItem[] = [DASHBOARD, TRANSACTIONS];
export const bottomNavRight: NavItem[] = [ACCOUNTS];

/** Secondary destinations surfaced in the mobile "Altro" sheet. */
export const moreNavItems: NavItem[] = [BUDGET, REPORTS, CATEGORIES, BACKUP, SETTINGS];

export function isActivePath(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
