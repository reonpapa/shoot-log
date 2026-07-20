export function validateTemperatureInput(value: string): string | null {
  return /^-?\d{0,3}(?:\.\d?)?$/.test(value) ? value : null;
}
