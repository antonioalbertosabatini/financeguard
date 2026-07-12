"use client";

import { TagInput } from "@/components/tags/tag-input";
import { useI18n } from "@/providers/i18n-provider";

type TagSingleInputProps = {
  value: string;
  onChange: (tag: string) => void;
  suggestions?: string[];
  placeholder?: string;
  id?: string;
  className?: string;
};

export function TagSingleInput({
  value,
  onChange,
  suggestions = [],
  placeholder,
  id,
  className,
}: TagSingleInputProps) {
  const { t } = useI18n();
  const resolvedPlaceholder = placeholder ?? t("labels.tags.example");
  const tags = value ? [value] : [];

  return (
    <TagInput
      id={id}
      value={tags}
      onChange={(next) => onChange(next[0] ?? "")}
      suggestions={suggestions}
      placeholder={resolvedPlaceholder}
      className={className}
      maxTags={1}
    />
  );
}
