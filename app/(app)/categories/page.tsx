"use client";

import { CategoriesView } from "@/components/categories/categories-view";
import { FullScreenLoader } from "@/components/providers/full-screen-loader";
import { getCategories } from "@/lib/actions/categories";
import { useAsyncData } from "@/lib/storage/use-async-data";

export default function CategoriesPage() {
  const { data } = useAsyncData(() => getCategories(), []);
  if (!data) return <FullScreenLoader />;
  return <CategoriesView categories={data} />;
}
