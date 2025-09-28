import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const DEFAULT_LOCALE = process.env.APP_LOCALE ?? "en-US";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function parseNumber(input: number | string | null | undefined): number {
  if (input == null) {
    return 0;
  }

  const value = typeof input === "string" ? Number(input) : input;
  if (Number.isNaN(value)) {
    return 0;
  }

  return value;
}

function parseDate(value: Date | string | number | null | undefined): Date | undefined {
  if (!value && value !== 0) {
    return undefined;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date;
}

export function formatCurrency(
  amount: number | string | null | undefined,
  currency = "USD",
  locale = DEFAULT_LOCALE,
): string {
  const value = parseNumber(amount);
  const code = currency?.toUpperCase?.() ?? "USD";

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${code} ${value.toFixed(2)}`;
  }
}

export function formatDate(
  value: Date | string | number | null | undefined,
  options: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" },
  locale = DEFAULT_LOCALE,
): string {
  const date = parseDate(value);
  if (!date) {
    return "";
  }

  try {
    return new Intl.DateTimeFormat(locale, options).format(date);
  } catch {
    return date.toISOString().split("T")[0] ?? "";
  }
}

export function formatDateTime(
  value: Date | string | number | null | undefined,
  locale = DEFAULT_LOCALE,
): string {
  return formatDate(
    value,
    {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    },
    locale,
  );
}

export function slugify(value: string, { maxLength = 48 }: { maxLength?: number } = {}): string {
  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (normalized.length === 0) {
    return "workspace";
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return normalized.slice(0, maxLength).replace(/-+$/, "");
}
