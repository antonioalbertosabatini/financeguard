"use client";

import {
  Briefcase,
  Car,
  Gamepad2,
  Gift,
  Heart,
  Home,
  Banknote,
  Plane,
  Plus,
  Pencil,
  ShoppingCart,
  Trash2,
  Utensils,
  Circle,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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
import type { Category } from "@/lib/schemas/category";

const ICON_OPTIONS = [
  "shopping-cart",
  "banknote",
  "home",
  "car",
  "utensils",
  "heart",
  "gamepad-2",
  "briefcase",
  "gift",
  "plane",
] as const;

const ICON_MAP: Record<string, LucideIcon> = {
  "shopping-cart": ShoppingCart,
  banknote: Banknote,
  home: Home,
  car: Car,
  utensils: Utensils,
  heart: Heart,
  "gamepad-2": Gamepad2,
  briefcase: Briefcase,
  gift: Gift,
  plane: Plane,
};

function CategoryIcon({ name, color }: { name: string; color: string }) {
  const Icon = ICON_MAP[name] ?? Circle;
  return <Icon className="size-5" style={{ color }} />;
}

export function CategoriesView({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<(typeof CATEGORY_TYPES)[number]>("expense");
  const [color, setColor] = useState("#ef4444");
  const [icon, setIcon] = useState<string>(ICON_OPTIONS[0]);

  function openCreate() {
    setEditing(null);
    setName("");
    setType("expense");
    setColor("#ef4444");
    setIcon(ICON_OPTIONS[0]);
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Card key={category.id}>
              <CardContent className="flex items-center justify-between pt-6">
                <div className="flex items-center gap-3">
                  <div
                    className="flex size-10 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${category.color}20` }}
                  >
                    <CategoryIcon name={category.icon} color={category.color} />
                  </div>
                  <div>
                    <p className="font-medium">{category.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {category.type === "income" ? "Entrata" : "Uscita"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => openEdit(category)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDelete(category.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
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
              <Select value={icon} onValueChange={setIcon}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ICON_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
