/**
 * Shared date formatting so every surface reads the same dialect. Previously
 * due dates used raw `toLocaleDateString()` ("7/6/2026") next to neighbours
 * using "Jul 6" — this collapses both onto one month-short style.
 */

function toDate(value: Date | string | number): Date {
  return value instanceof Date ? value : new Date(value);
}

/** "Jul 6" / "Jul 6, 2026" when the year differs from now. */
export function formatDate(value: Date | string | number): string {
  const d = toDate(value);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  }).format(d);
}

/** "Jul 6, 3:20 PM" — a date with the time of day. */
export function formatDateTime(value: Date | string | number): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(toDate(value));
}
