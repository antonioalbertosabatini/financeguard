"use client";

import { useRef, useState } from "react";
import { Tag, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  dedupeTags,
  filterTagSuggestions,
  normalizeTag,
} from "@/lib/utils/tags";
import { useI18n } from "@/providers/i18n-provider";

type TagInputProps = {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  id?: string;
  className?: string;
  maxTags?: number;
};

export function TagInput({
  value,
  onChange,
  suggestions = [],
  placeholder,
  id,
  className,
  maxTags,
}: TagInputProps) {
  const { t } = useI18n();
  const resolvedPlaceholder = placeholder ?? t("labels.tags.add");
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const atMax = maxTags !== undefined && value.length >= maxTags;
  const filteredSuggestions = filterTagSuggestions(
    inputValue,
    suggestions,
    value
  ).slice(0, 8);

  function addTag(raw: string) {
    const normalized = normalizeTag(raw);
    if (!normalized) return;
    if (maxTags === 1) {
      onChange([normalized]);
    } else {
      onChange(dedupeTags([...value, normalized]));
    }
    setInputValue("");
    setShowSuggestions(false);
  }

  function removeTag(tag: string) {
    onChange(value.filter((t) => normalizeTag(t) !== normalizeTag(tag)));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (inputValue.trim()) addTag(inputValue);
      return;
    }
    if (e.key === "Backspace" && !inputValue && value.length > 0) {
      onChange(value.slice(0, -1));
    }
    if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  }

  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent px-2 py-1.5 shadow-xs transition-colors",
          "focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50"
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className="gap-1 pr-1"
          >
            <Tag className="size-3" />
            {tag}
            <button
              type="button"
              className="rounded-full p-0.5 hover:bg-muted"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
              aria-label={t("common.removeTag", { tag })}
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
        {!atMax && (
          <input
            ref={inputRef}
            id={id}
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value.replace(/,/g, ""));
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => {
              setTimeout(() => setShowSuggestions(false), 150);
            }}
            onKeyDown={handleKeyDown}
            placeholder={value.length === 0 ? resolvedPlaceholder : ""}
            className="min-w-[80px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        )}
      </div>

      {showSuggestions && filteredSuggestions.length > 0 && !atMax && (
        <ul className="absolute z-50 mt-1 max-h-40 w-full overflow-auto rounded-lg border bg-popover p-1 shadow-md">
          {filteredSuggestions.map((suggestion) => (
            <li key={suggestion}>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                onMouseDown={(e) => {
                  e.preventDefault();
                  addTag(suggestion);
                }}
              >
                <Tag className="size-3 text-muted-foreground" />
                {suggestion}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
