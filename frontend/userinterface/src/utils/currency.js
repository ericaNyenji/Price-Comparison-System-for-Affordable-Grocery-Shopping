// src/utils/currency.js

/**
 * Formats a number into a localized currency string
 * based on the user's saved currency code.
 */
export function formatCurrency(amount) {
  // Get user currency code from session storage (saved at login)
  const currencyCode = sessionStorage.getItem("currencyCode") || "USD";

  // Handle invalid amounts gracefully
  if (amount == null || isNaN(amount)) return "0.00";

  // Use Intl.NumberFormat for proper localization
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch (e) {
    // Fallback if currencyCode is not recognized
    return `${currencyCode} ${Number(amount).toFixed(2)}`;
  }
}
