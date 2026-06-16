import {
  Banknote,
  Briefcase,
  Building,
  Car,
  Coffee,
  CreditCard,
  Home,
  Landmark,
  PiggyBank,
  Plane,
  Receipt,
  ShoppingBag,
  Smartphone,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { ACCOUNT_ICON_FALLBACK } from "@/lib/constants/account-icons";

const ICON_MAP: Record<string, LucideIcon> = {
  wallet: Wallet,
  landmark: Landmark,
  "credit-card": CreditCard,
  "piggy-bank": PiggyBank,
  building: Building,
  smartphone: Smartphone,
  banknote: Banknote,
  receipt: Receipt,
  briefcase: Briefcase,
  home: Home,
  car: Car,
  plane: Plane,
  coffee: Coffee,
  "shopping-bag": ShoppingBag,
  sparkles: Sparkles,
  wrench: Wrench,
  "trending-up": TrendingUp,
  "trending-down": TrendingDown,
  [ACCOUNT_ICON_FALLBACK]: Wallet,
};

type AccountIconProps = {
  name: string;
  className?: string;
};

export function AccountIcon({ name, className = "size-5" }: AccountIconProps) {
  const Icon = ICON_MAP[name] ?? Wallet;
  return <Icon className={className} />;
}
