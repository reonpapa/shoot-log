export function validateTemperatureInput(value: string): string | null {
  const normalized = value
    .replace(/[０-９]/g, (digit) => String.fromCharCode(digit.charCodeAt(0) - 0xfee0))
    .replace(/[．。]/g, ".")
    .replace(/[－−ー]/g, "-")
    .replace(/℃$/i, "");
  return /^-?\d{0,3}(?:\.\d?)?$/.test(normalized) ? normalized : null;
}
