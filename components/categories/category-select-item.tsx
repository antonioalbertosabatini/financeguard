import { CategoryIcon } from "@/components/categories/category-icon";
import { SelectItem } from "@/components/ui/select";
import type { Category } from "@/lib/schemas/category";

type CategorySelectItemProps = {
  category: Category;
};

export function CategorySelectItem({ category }: CategorySelectItemProps) {
  return (
    <SelectItem value={category.id}>
      <span className="flex items-center gap-2">
        <CategoryIcon
          name={category.icon}
          color={category.color}
          className="size-3.5"
        />
        {category.name}
      </span>
    </SelectItem>
  );
}
