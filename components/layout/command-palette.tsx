"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Eye,
  EyeOff,
  Keyboard,
  Moon,
  PanelLeft,
  Plus,
  Receipt,
  Sun,
} from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Command as CommandPrimitive } from "cmdk";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { useNavConfig } from "@/hooks/use-nav-config";
import { useYearHref } from "@/hooks/use-year-href";
import { useFormatCents } from "@/hooks/use-format-cents";
import {
  modKeyLabel,
  useKeyboardShortcuts,
  type KeyboardShortcut,
} from "@/hooks/use-keyboard-shortcuts";
import { getCategories } from "@/lib/actions/categories";
import { getTransactionsForListView } from "@/lib/actions/transactions";
import { useAsyncData } from "@/lib/storage/use-async-data";
import { formatDate } from "@/lib/utils/dates";
import { useAmountVisibility } from "@/providers/amount-visibility-provider";
import { useI18n } from "@/providers/i18n-provider";
import { useSidebar } from "@/providers/sidebar-provider";
import { useTheme } from "@/providers/theme-provider";
import { useYear } from "@/providers/year-provider";
import { cn } from "@/lib/utils";

interface CommandPaletteContextValue {
  openPalette: () => void;
  openShortcuts: () => void;
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

const MAX_TRANSACTION_RESULTS = 8;

function KeyHint({ keys }: { keys: string[] }) {
  return (
    <span data-slot="command-shortcut" className="ml-auto flex shrink-0 items-center gap-1">
      {keys.map((k, i) => (
        <Kbd key={i}>{k}</Kbd>
      ))}
    </span>
  );
}

function PaletteDialog({
  open,
  onOpenChange,
  onShowShortcuts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShowShortcuts: () => void;
}) {
  const router = useRouter();
  const { t, language } = useI18n();
  const { allNavItems } = useNavConfig();
  const withYear = useYearHref();
  const { year, setYear, availableYears } = useYear();
  const { resolvedTheme, setTheme } = useTheme();
  const { amountsHidden, toggleAmountsVisibility } = useAmountVisibility();
  const { toggleHidden } = useSidebar();
  const formatCents = useFormatCents();
  const [query, setQuery] = useState("");

  // Loaded only while the palette is open.
  const { data } = useAsyncData(
    async () => {
      if (!open) return null;
      const [{ transactions }, categories] = await Promise.all([
        getTransactionsForListView(year),
        getCategories(),
      ]);
      return { transactions, categories };
    },
    [year, open]
  );

  const transactionResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!data || q.length < 2) return [];
    const categoryName = new Map(data.categories.map((c) => [c.id, c.name]));
    const results = [];
    for (const tx of data.transactions) {
      const cat = tx.categoryId ? categoryName.get(tx.categoryId) ?? "" : "";
      const haystack = [tx.notes, cat, ...(tx.tags ?? []), (tx.amount / 100).toFixed(2)]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) continue;
      results.push({
        id: tx.id,
        title: tx.notes?.trim() || cat || t("palette.uncategorized"),
        meta: [cat, formatDate(tx.date, "dd/MM/yyyy", language)].filter(Boolean).join(" · "),
        amount: `${tx.type === "income" ? "+" : tx.type === "expense" ? "−" : ""}${formatCents(tx.amount)}`,
        income: tx.type === "income",
      });
      if (results.length >= MAX_TRANSACTION_RESULTS) break;
    }
    return results;
  }, [data, query, t, language, formatCents]);

  const run = useCallback(
    (action: () => void) => {
      onOpenChange(false);
      setQuery("");
      action();
    },
    [onOpenChange]
  );

  const mod = modKeyLabel();

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setQuery("");
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="top-[12vh] max-w-[calc(100%-1.5rem)] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl sm:p-0"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{t("palette.title")}</DialogTitle>
          <DialogDescription>{t("palette.description")}</DialogDescription>
        </DialogHeader>
        <Command loop className="rounded-none bg-transparent">
          <div className="flex items-center gap-3 border-b border-border px-4">
            <CommandPrimitive.Input
              value={query}
              onValueChange={setQuery}
              placeholder={t("palette.placeholder")}
              className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
            />
            <Kbd>esc</Kbd>
          </div>
          <CommandList className="max-h-[min(26rem,60vh)] p-2">
            <CommandEmpty>{t("palette.empty")}</CommandEmpty>

            {transactionResults.length > 0 && (
              <CommandGroup heading={t("palette.transactions", { year })} forceMount>
                {transactionResults.map((r) => (
                  <CommandItem
                    key={r.id}
                    value={`tx-${r.id}`}
                    forceMount
                    onSelect={() =>
                      run(() => router.push(withYear(`/transactions?tx=${r.id}`)))
                    }
                    className="h-auto py-2"
                  >
                    <Receipt className="text-muted-foreground" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{r.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">{r.meta}</span>
                    </span>
                    <span
                      className={cn(
                        "ml-auto text-sm font-semibold tabular-nums",
                        r.income && "text-success"
                      )}
                    >
                      {r.amount}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            <CommandGroup heading={t("palette.actions")}>
              <CommandItem onSelect={() => run(() => router.push(withYear("/add")))}>
                <Plus />
                {t("palette.newTransaction")}
                <KeyHint keys={["N"]} />
              </CommandItem>
              <CommandItem
                onSelect={() =>
                  run(() => setTheme(resolvedTheme === "dark" ? "light" : "dark"))
                }
              >
                {resolvedTheme === "dark" ? <Sun /> : <Moon />}
                {resolvedTheme === "dark" ? t("palette.switchToLight") : t("palette.switchToDark")}
              </CommandItem>
              <CommandItem onSelect={() => run(toggleAmountsVisibility)}>
                {amountsHidden ? <Eye /> : <EyeOff />}
                {amountsHidden ? t("common.showAmounts") : t("common.hideAmounts")}
                <KeyHint keys={["H"]} />
              </CommandItem>
              <CommandItem
                className="hidden md:flex"
                onSelect={() => run(toggleHidden)}
              >
                <PanelLeft />
                {t("palette.toggleSidebar")}
              </CommandItem>
              <CommandItem onSelect={() => run(onShowShortcuts)}>
                <Keyboard />
                {t("palette.shortcuts")}
                <KeyHint keys={["?"]} />
              </CommandItem>
            </CommandGroup>

            <CommandSeparator className="my-1" />

            <CommandGroup heading={t("palette.goTo")}>
              {allNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={item.href}
                    value={`${item.label} ${item.description}`}
                    onSelect={() => run(() => router.push(withYear(item.href)))}
                  >
                    <Icon />
                    {item.label}
                    <span className="truncate text-xs text-muted-foreground">
                      {item.description}
                    </span>
                    <KeyHint keys={["G", item.shortcut.toUpperCase()]} />
                  </CommandItem>
                );
              })}
            </CommandGroup>

            {availableYears.length > 1 && (
              <>
                <CommandSeparator className="my-1" />
                <CommandGroup heading={t("palette.years")}>
                  {availableYears
                    .filter((y) => y !== year)
                    .map((y) => (
                      <CommandItem
                        key={y}
                        value={`year ${y} ${t("palette.yearItem", { year: y })}`}
                        onSelect={() => run(() => setYear(y))}
                      >
                        <CalendarDays />
                        {t("palette.yearItem", { year: y })}
                      </CommandItem>
                    ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
          <div className="hidden items-center gap-4 border-t border-border bg-surface-2/60 px-4 py-2.5 text-xs text-muted-foreground sm:flex">
            <span className="flex items-center gap-1">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd>
            </span>
            <span className="flex items-center gap-1">
              <Kbd>↵</Kbd>
            </span>
            <span className="ml-auto flex items-center gap-1">
              <Kbd>{mod}</Kbd>
              <Kbd>K</Kbd>
            </span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

function ShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const { allNavItems } = useNavConfig();
  const mod = modKeyLabel();

  const rows: { label: string; keys: string[] }[] = [
    { label: t("shortcuts.openPalette"), keys: [mod, "K"] },
    { label: t("shortcuts.search"), keys: ["/"] },
    { label: t("shortcuts.newTransaction"), keys: ["N"] },
    { label: t("shortcuts.toggleAmounts"), keys: ["H"] },
    { label: t("shortcuts.toggleSidebar"), keys: [mod, "B"] },
    { label: t("shortcuts.help"), keys: ["?"] },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("shortcuts.title")}</DialogTitle>
          <DialogDescription>{t("shortcuts.description")}</DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-4 overflow-y-auto">
          <ul className="divide-y divide-border rounded-xl border border-border">
            {rows.map((row) => (
              <li key={row.label} className="flex items-center gap-3 px-3.5 py-2.5 text-sm">
                {row.label}
                <KeyHint keys={row.keys} />
              </li>
            ))}
          </ul>
          <ul className="divide-y divide-border rounded-xl border border-border">
            {allNavItems.map((item) => (
              <li key={item.href} className="flex items-center gap-3 px-3.5 py-2.5 text-sm">
                {t("shortcuts.goTo", { section: item.label })}
                <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                  <Kbd>G</Kbd>
                  {t("shortcuts.then")}
                  <Kbd>{item.shortcut.toUpperCase()}</Kbd>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Provides the ⌘K command palette, the shortcuts help dialog and the global
 * keyboard shortcuts (N, /, H, ?, ⌘B, G + letter).
 */
export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const withYear = useYearHref();
  const { allNavItems } = useNavConfig();
  const { toggleAmountsVisibility } = useAmountVisibility();
  const { toggleCollapsed } = useSidebar();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const openShortcuts = useCallback(() => {
    setPaletteOpen(false);
    setShortcutsOpen(true);
  }, []);

  const shortcuts: KeyboardShortcut[] = [
    { keys: "mod+k", global: true, handler: () => setPaletteOpen((o) => !o) },
    { keys: "/", handler: openPalette },
    { keys: "n", handler: () => router.push(withYear("/add")) },
    { keys: "h", handler: toggleAmountsVisibility },
    { keys: "mod+b", handler: toggleCollapsed },
    { keys: "?", handler: openShortcuts },
    ...allNavItems.map((item) => ({
      keys: `g ${item.shortcut}`,
      handler: () => router.push(withYear(item.href)),
    })),
  ];
  useKeyboardShortcuts(shortcuts);

  const value = useMemo(
    () => ({ openPalette, openShortcuts }),
    [openPalette, openShortcuts]
  );

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
      <PaletteDialog
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onShowShortcuts={openShortcuts}
      />
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </CommandPaletteContext.Provider>
  );
}

export function useCommandPalette() {
  const ctx = useContext(CommandPaletteContext);
  if (!ctx) throw new Error("useCommandPalette must be used within CommandPaletteProvider");
  return ctx;
}
