import { CategoriesView } from "@/components/categories/categories-view";
import { getCategories } from "@/lib/actions/categories";

export default async function CategoriesPage() {
  const categories = await getCategories();
  return <CategoriesView categories={categories} />;
}
