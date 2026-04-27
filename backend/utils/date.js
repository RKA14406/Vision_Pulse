export function nowIso() {
  return new Date().toISOString();
}

export function daysFromNow(days, hour = 15, minute = 30) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}
