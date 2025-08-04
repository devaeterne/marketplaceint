export function formatCurrency(value: number | string): string {
  const numberValue = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(numberValue);
}
