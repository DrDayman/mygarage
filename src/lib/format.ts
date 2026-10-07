import type { ISODate } from '../types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function parseLocalDate(value: ISODate): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function toISODate(date: Date): ISODate {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayISO(now = new Date()): ISODate {
  return toISODate(now);
}

export function addDays(value: ISODate, days: number): ISODate {
  const date = parseLocalDate(value);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

export function addMonths(value: ISODate, months: number): ISODate {
  const date = parseLocalDate(value);
  date.setMonth(date.getMonth() + months);
  return toISODate(date);
}

export function daysBetween(from: ISODate, to: ISODate): number {
  return Math.round((parseLocalDate(to).getTime() - parseLocalDate(from).getTime()) / MS_PER_DAY);
}

export function formatDate(value?: ISODate): string {
  if (!value) return '—';
  return parseLocalDate(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const currencyWhole = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export function formatCurrency(value: number, { whole = false } = {}): string {
  return (whole ? currencyWhole : currency).format(value);
}

export function formatMiles(value: number): string {
  return `${Math.round(value).toLocaleString('en-US')} mi`;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count.toLocaleString('en-US')} ${count === 1 ? singular : plural}`;
}

export function newId(prefix: string): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}_${random}`;
}
