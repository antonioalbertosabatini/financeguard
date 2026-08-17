import { useMemo } from "react";
import { useI18n } from "@/providers/i18n-provider";
import {
  DASHBOARD,
  TRANSACTIONS,
  ACCOUNTS,
  BUDGET,
  PLANS,
  REPORTS,
  CATEGORIES,
  BACKUP,
  PROFILE,
  SETTINGS,
  bottomNavLeft,
  bottomNavRight,
  moreNavItems,
  type NavGroup,
  type NavItem,
  type TranslatedNavItem,
} from "@/components/layout/nav-config";

import type { MessageKey } from "@/lib/i18n/types";

function translateNavItem(
  item: NavItem,
  t: (key: MessageKey, params?: Record<string, string | number>) => string
): TranslatedNavItem {
  return { ...item, label: t(item.labelKey) };
}

export function useNavConfig() {
  const { t } = useI18n();

  return useMemo(() => {
    const navGroups: NavGroup[] = [
      {
        labelKey: "nav.group.main" as const,
        items: [DASHBOARD],
      },
      {
        labelKey: "nav.group.management" as const,
        items: [TRANSACTIONS, ACCOUNTS, BUDGET, PLANS, REPORTS, CATEGORIES],
      },
      {
        labelKey: "nav.group.system" as const,
        items: [BACKUP, PROFILE, SETTINGS],
      },
    ].map((group) => ({
      label: t(group.labelKey),
      items: group.items.map((item) => translateNavItem(item, t)),
    }));

    return {
      navGroups,
      bottomNavLeft: bottomNavLeft.map((item) => translateNavItem(item, t)),
      bottomNavRight: bottomNavRight.map((item) => translateNavItem(item, t)),
      moreNavItems: moreNavItems.map((item) => translateNavItem(item, t)),
      dashboard: translateNavItem(DASHBOARD, t),
      transactions: translateNavItem(TRANSACTIONS, t),
      accounts: translateNavItem(ACCOUNTS, t),
      budget: translateNavItem(BUDGET, t),
      plans: translateNavItem(PLANS, t),
      reports: translateNavItem(REPORTS, t),
      categories: translateNavItem(CATEGORIES, t),
      backup: translateNavItem(BACKUP, t),
      profile: translateNavItem(PROFILE, t),
      settings: translateNavItem(SETTINGS, t),
    };
  }, [t]);
}
