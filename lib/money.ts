export function parseAmount(value: unknown) {
  const raw = String(value ?? "").replace(/\s/g, "");
  if (!raw) return null;

  let normalized = raw;
  if (raw.includes(",") && raw.includes(".")) {
    const decimalSeparator = raw.lastIndexOf(",") > raw.lastIndexOf(".") ? "," : ".";
    const groupingSeparator = decimalSeparator === "," ? /\./g : /,/g;
    normalized = raw.replace(groupingSeparator, "").replace(decimalSeparator, ".");
  } else if (raw.includes(",")) {
    normalized = /^\d{1,3}(,\d{3})+$/.test(raw) ? raw.replace(/,/g, "") : raw.replace(",", ".");
  } else if (raw.includes(".") && /^\d{1,3}(\.\d{3})+$/.test(raw)) {
    normalized = raw.replace(/\./g, "");
  }

  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) throw new Error("Escribe un importe válido igual o mayor que cero.");
  return amount;
}