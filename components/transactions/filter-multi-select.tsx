"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type FilterMultiOption = {
  value: string;
  label: string;
  icon?: ReactNode;
};

type FilterMultiSelectProps = {
  options: FilterMultiOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  selectedLabel: (count: number) => string;
  emptyLabel?: string;
  /** Show search field when option count is at least this (default 8). Pass 0 to always show. */
  searchThreshold?: number;
  searchPlaceholder?: string;
  contentClassName?: string;
};

function toggleValue(values: string[], value: string): string[] {
  return values.includes(value)
    ? values.filter((v) => v !== value)
    : [...values, value];
}

export function FilterMultiSelect({
  options,
  selected,
  onChange,
  placeholder,
  selectedLabel,
  emptyLabel,
  searchThreshold = 8,
  searchPlaceholder = "…",
  contentClassName,
}: FilterMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const triggerText =
    selected.length === 0 ? placeholder : selectedLabel(selected.length);

  const showSearch = options.length >= searchThreshold;

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(q) ||
        option.value.toLowerCase().includes(q)
    );
  }, [options, query]);

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
          <span className="truncate">{triggerText}</span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          "w-[var(--radix-popover-trigger-width)] p-1",
          contentClassName
        )}
        align="start"
      >
        {options.length === 0 ? (
          <p className="px-2 py-1.5 text-sm text-muted-foreground">
            {emptyLabel ?? "—"}
          </p>
        ) : (
          <>
            {showSearch && (
              <div className="p-1 pb-0">
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="h-8"
                  autoFocus
                />
              </div>
            )}
            {filteredOptions.length === 0 ? (
              <p className="px-2 py-1.5 text-sm text-muted-foreground">
                {emptyLabel ?? "—"}
              </p>
            ) : (
              <ul
                className="max-h-56 overflow-y-auto"
                role="listbox"
                aria-multiselectable
              >
                {filteredOptions.map((option) => {
                  const checked = selected.includes(option.value);
                  function toggle() {
                    onChange(toggleValue(selected, option.value));
                  }
                  return (
                    <li key={option.value} role="presentation">
                      <div
                        role="option"
                        aria-selected={checked}
                        tabIndex={0}
                        className={cn(
                          "flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent",
                          checked && "bg-accent/60"
                        )}
                        onClick={toggle}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggle();
                          }
                        }}
                      >
                        <Checkbox
                          checked={checked}
                          tabIndex={-1}
                          className="pointer-events-none"
                          aria-hidden
                        />
                        {option.icon}
                        <span className="min-w-0 flex-1 truncate">
                          {option.label}
                        </span>
                        {checked && (
                          <Check className="size-3.5 shrink-0 opacity-60" />
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
