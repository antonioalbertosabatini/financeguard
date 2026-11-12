"use client";

import { CategoriesView } from "@/components/categories/categories-view";
import { ErrorState } from "@/components/common/error-state";
import { PageSkeleton } from "@/components/common/page-skeleton";
import { getCategories } from "@/lib/actions/categories";
import { useAsyncData } from "@/lib/storage/use-async-data";

export default function CategoriesPage() {
  const { data, failed, error, reload } = useAsyncData(() => getCategories(), []);
  if (!data && failed) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <PageSkeleton variant="cards" />;
  return <CategoriesView categories={data} />;
}
