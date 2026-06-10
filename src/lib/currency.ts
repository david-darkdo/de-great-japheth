export type Currency = "NGN" | "USD";

export function currencySymbol(currency?: string | null): string {
  return currency === "USD" ? "$" : "₦";
}

export function formatPrice(price?: number | null, currency?: string | null): string {
  if (price == null) return "";
  return `${currencySymbol(currency)}${Number(price).toLocaleString()}`;
}
