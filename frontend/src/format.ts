export function pct(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

export function num(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined) return "—";
  return value.toFixed(decimals);
}
