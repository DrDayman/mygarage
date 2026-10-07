import type { MaintenanceLog, Vehicle } from '../types';

type Cell = string | number | null | undefined;

/**
 * RFC 4180 field escaping, plus a guard against CSV/formula injection: text that
 * starts with = + - @ is prefixed with ' so spreadsheets don't execute it.
 */
export function escapeCsvCell(value: Cell): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return String(value);
  let text = value;
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows: Cell[][]): string {
  return rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
}

export function logsToCsv(logs: MaintenanceLog[], vehicles: Vehicle[]): string {
  const names = new Map(vehicles.map((v) => [v.id, `${v.year} ${v.make} ${v.model}`]));
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date) || a.mileage - b.mileage);
  return toCsv([
    ['Vehicle', 'Date', 'Service Type', 'Mileage', 'Cost (USD)', 'Notes'],
    ...sorted.map((l) => [names.get(l.vehicleId) ?? '', l.date, l.serviceType, l.mileage, l.cost.toFixed(2), l.notes]),
  ]);
}

export function downloadFile(filename: string, contents: string, type: string): void {
  // BOM so Excel opens UTF-8 CSVs correctly.
  const blob = new Blob([type.startsWith('text/csv') ? '﻿' + contents : contents], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.replace(/[^\w.-]+/g, '_');
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
