"use client";

import { useEffect, useState } from "react";
import { ChevronsUpDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { searchSymbols, type SymbolResult } from "@/lib/market";
import type { InstrumentKind } from "@/lib/schemas/instrument";
import { useI18n } from "@/providers/i18n-provider";

const DEBOUNCE_MS = 300;

/**
 * Selettore di titoli con ricerca remota: l'elenco completo degli strumenti e'
 * troppo grande per essere incluso nell'app, quindi si interroga il provider
 * mentre si digita. Costruito su Popover + Input come gli altri selettori
 * ricercabili del progetto.
 */
export function SymbolSearch({
  kind,
  value,
  onSelect,
}: {
  kind: InstrumentKind;
  value: SymbolResult | null;
  onSelect: (result: SymbolResult) => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SymbolResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const trimmed = query.trim();
  const active = trimmed.length >= 2;
  // I risultati della ricerca precedente non vanno mostrati mentre si riscrive.
  const visibleResults = active ? results : [];
  const searching = active && loading;

  useEffect(() => {
    if (!active) return;

    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      searchSymbols(trimmed, kind, controller.signal)
        .then((found) => {
          if (controller.signal.aborted) return;
          setResults(found);
          setFailed(false);
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          setResults([]);
          setFailed(true);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, kind, active]);

  function renderStatus() {
    if (!active) return t("investments.form.symbolHint");
    if (searching) return t("investments.form.symbolSearching");
    if (failed) return t("investments.form.symbolError");
    return t("investments.form.symbolNoResults");
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between font-normal"
          type="button"
        >
          <span className="truncate">
            {value
              ? `${value.ticker} — ${value.name}`
              : t("investments.form.symbolSelect")}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-1"
        align="start"
      >
        <div className="relative p-1 pb-0">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("investments.form.symbolPlaceholder")}
            className="h-8 pr-8"
            autoFocus
          />
          {searching && (
            <Loader2 className="absolute right-3 top-3 size-4 animate-spin opacity-50" />
          )}
        </div>

        {visibleResults.length === 0 ? (
          <p className="px-2 py-2 text-sm text-muted-foreground">
            {renderStatus()}
          </p>
        ) : (
          <ul className="max-h-64 overflow-y-auto" role="listbox">
            {visibleResults.map((result) => (
              <li key={`${result.symbol}-${result.exchange}`}>
                <button
                  type="button"
                  role="option"
                  aria-selected={value?.symbol === result.symbol}
                  className="flex w-full flex-col items-start gap-0.5 rounded-md px-2 py-1.5 text-left hover:bg-accent"
                  onClick={() => {
                    onSelect(result);
                    setOpen(false);
                  }}
                >
                  <span className="flex w-full items-center gap-2 text-sm font-medium">
                    <span className="truncate">{result.ticker}</span>
                    {result.exchange && (
                      <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-normal uppercase text-muted-foreground">
                        {result.exchange}
                      </span>
                    )}
                    {result.currency && (
                      <span className="ml-auto shrink-0 text-xs font-normal text-muted-foreground">
                        {result.currency}
                      </span>
                    )}
                  </span>
                  <span className="w-full truncate text-xs text-muted-foreground">
                    {result.name}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
