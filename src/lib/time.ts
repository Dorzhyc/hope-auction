// We store ends_at as timestamptz in DB. Moscow timezone is used only for display.
// Client can show "MSK" label; server uses now() in DB (UTC-safe) for comparisons.

export function formatMskMinute(iso: string): string {
  const d = new Date(iso);
  // Format in Europe/Moscow
  const fmt = new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  return fmt.format(d).replace(",", "");
}
