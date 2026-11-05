/** Calendar dates for the Argentine fields supported by this application. */
export const FIELD_TIMEZONE = 'America/Argentina/Buenos_Aires';

export function fieldDateString(value: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: FIELD_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(value);
  const part = (type: string) => parts.find((item) => item.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function shiftFieldDate(value: string, days: number): string {
  const parsed = new Date(`${value}T12:00:00Z`);
  if (!Number.isFinite(parsed.getTime())) return value;
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

export function fieldEventDate(value: string): string {
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? fieldDateString(parsed) : value.slice(0, 10);
}

export function fieldEventTime(value: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: FIELD_TIMEZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(new Date(value));
}

export function fieldDateTimeIso(date: string, time: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    throw new Error('Fecha u hora inválida.');
  }
  // Argentina has used UTC-03:00 without seasonal clock changes since 2009.
  const parsed = new Date(`${date}T${time}:00-03:00`);
  if (!Number.isFinite(parsed.getTime()) || fieldDateString(parsed) !== date) throw new Error('Fecha inválida.');
  return parsed.toISOString();
}
