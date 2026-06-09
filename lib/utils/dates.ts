import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";

export function formatDate(date: string, pattern = "dd/MM/yyyy"): string {
  return format(parseISO(date), pattern, { locale: it });
}

export function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function currentYear(): number {
  return new Date().getFullYear();
}

export function currentMonth(): number {
  return new Date().getMonth() + 1;
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function toISODate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function getMonthFromDate(date: string): number {
  return parseInt(date.slice(5, 7), 10);
}

export function getDayFromDate(date: string): number {
  return parseInt(date.slice(8, 10), 10);
}
