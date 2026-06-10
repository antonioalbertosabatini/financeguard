"use client";

import { Plus, Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CategoryIcon } from "@/components/categories/category-icon";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createCategory,
  deleteCategory,
  updateCategory,
} from "@/lib/actions/categories";
import { CATEGORY_TYPES } from "@/lib/constants";
import { CATEGORY_ICON_NAMES } from "@/lib/constants/category-icons";
import type { Category } from "@/lib/schemas/category";
import { cn } from "@/lib/utils";

type CategoryCardProps = {
  category: Category;
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
};

function CategoryCard({ category, onEdit, onDelete }: CategoryCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between pt-6">
        <div className="flex items-center gap-3">
          <div
            className="flex size-10 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${category.color}20` }}
          >
            <CategoryIcon name={category.icon} color={category.color} />
          </div>
          <p className="font-medium">{category.name}</p>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onEdit(category)}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onDelete(category.id)}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

type CategorySectionProps = {
  title: string;
  categories: Category[];
  emptyMessage: string;
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
};

function CategorySection({
  title,
  categories,
  emptyMessage,
  onEdit,
  onDelete,
}: CategorySectionProps) {
  const countLabel =
    categories.length === 1 ? "1 categoria" : `${categories.length} categorie`;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{countLabel}</p>
      </div>
      {categories.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function CategoriesView({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<(typeof CATEGORY_TYPES)[number]>("expense");
  const [color, setColor] = useState("#ef4444");
  const [icon, setIcon] = useState<string>(CATEGORY_ICON_NAMES[0]);

  const incomeCategories = useMemo(
    () => categories.filter((c) => c.type === "income"),
    [categories]
  );
  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === "expense"),
    [categories]
  );

  function openCreate() {
    setEditing(null);
    setName("");
    setType("expense");
    setColor("#ef4444");
    setIcon(CATEGORY_ICON_NAMES[0]);
    setOpen(true);
  }

  function openEdit(category: Category) {
    setEditing(category);
    setName(category.name);
    setType(category.type);
    setColor(category.color);
    setIcon(category.icon);
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data = { name, type, color, icon };
    try {
      if (editing) {
        await updateCategory(editing.id, data);
        toast.success("Categoria aggiornata");
      } else {
        await createCategory(data);
        toast.success("Categoria creata");
      }
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminare questa categoria?")) return;
    try {
      await deleteCategory(id);
      toast.success("Categoria eliminata");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categorie"
        description="Entrate e uscite"
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Nuova categoria
          </Button>
        }
      />

      {categories.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Nessuna categoria. Creane una per classificare le transazioni.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          <CategorySection
            title="Entrate"
            categories={incomeCategories}
            emptyMessage="Nessuna categoria di entrata."
            onEdit={openEdit}
            onDelete={handleDelete}
          />
          <CategorySection
            title="Uscite"
            categories={expenseCategories}
            emptyMessage="Nessuna categoria di uscita."
            onEdit={openEdit}
            onDelete={handleDelete}
          />
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Modifica categoria" : "Nuova categoria"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cat-name">Nome</Label>
              <Input
                id="cat-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Uscita</SelectItem>
                  <SelectItem value="income">Entrata</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">Colore</Label>
              <Input
                id="color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Icona</Label>
              <div className="grid grid-cols-6 gap-2">
                {CATEGORY_ICON_NAMES.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    title={opt}
                    onClick={() => setIcon(opt)}
                    className={cn(
                      "flex size-10 items-center justify-center rounded-lg border transition-colors",
                      icon === opt
                        ? "border-primary bg-primary/10 ring-2 ring-primary ring-offset-2"
                        : "border-border hover:bg-muted"
                    )}
                  >
                    <CategoryIcon name={opt} color={color} className="size-5" />
                  </button>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Salva</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
