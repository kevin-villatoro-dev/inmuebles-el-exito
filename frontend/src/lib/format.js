export function formatCurrency(value) {
  if (value === null || value === undefined) return "Precio por confirmar";
  return new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency: "GTQ",
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: 0
  }).format(value);
}

export function formatDate(value) {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-GT", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export function initials(value = "IE") {
  return value.split(" ").filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
}
