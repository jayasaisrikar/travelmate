import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { TripCurrency } from "@/lib/travel-types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currencyCode = "USD") {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currencyCode, maximumFractionDigits: 0 }).format(amount);
  } catch {
    // Unknown/invalid ISO 4217 code — fall back to USD formatting.
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
  }
}

// Itinerary amounts are stored in the destination's currency. The traveler sees
// everything converted to their home currency — one currency they understand —
// which is the cleanest UX. Falls back to formatting the amount as-is (USD) when
// no currency metadata is present (e.g. older saved trips).
export function formatTripMoney(amount: number, currency?: TripCurrency | null): string {
  if (!currency) {
    return formatCurrency(amount);
  }

  const rate = typeof currency.rateToHome === "number" && currency.rateToHome > 0 ? currency.rateToHome : 1;
  return formatCurrency(amount * rate, currency.home || "USD");
}
