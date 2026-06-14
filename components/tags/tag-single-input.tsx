"use client";

import { TagInput } from "@/components/tags/tag-input";

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
  placeholder = "es. lavoro",
  id,
  className,
}: TagSingleInputProps) {
  const tags = value ? [value] : [];

  return (
    <TagInput
      id={id}
      value={tags}
      onChange={(next) => onChange(next[0] ?? "")}
      suggestions={suggestions}
      placeholder={placeholder}
      className={className}
      maxTags={1}
    />
  );
}
