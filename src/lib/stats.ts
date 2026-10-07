import type { ISODate, MaintenanceLog, Vehicle } from '../types';
import { daysBetween, parseLocalDate, todayISO } from './format';

export function sumCost(logs: MaintenanceLog[]): number {
  return logs.reduce((sum, log) => sum + log.cost, 0);
}

export interface OwnershipSummary {
  maintenance: number;
  purchasePrice: number | null;
  soldPrice: number | null;
  /** Purchase + maintenance − sale proceeds. Null when there's no purchase price. */
  netCost: number | null;
  yearsOwned: number | null;
  /** Maintenance spend per year of ownership. */
  maintenancePerYear: number | null;
  /** Net cost per year of ownership (depreciation + upkeep). */
  costPerYear: number | null;
}

export function ownershipSummary(
  vehicle: Vehicle,
  vehicleLogs: MaintenanceLog[],
  today: ISODate = todayISO(),
): OwnershipSummary {
  const maintenance = sumCost(vehicleLogs);
  const purchasePrice = vehicle.purchasePrice ?? null;
  const soldPrice = vehicle.soldPrice ?? null;
  const netCost = purchasePrice === null ? null : purchasePrice + maintenance - (soldPrice ?? 0);

  let yearsOwned: number | null = null;
  if (vehicle.purchaseDate) {
    const end = vehicle.soldDate || today;
    yearsOwned = Math.max(0, daysBetween(vehicle.purchaseDate, end) / 365.25);
  }
  // Avoid absurd per-year figures for vehicles owned only a few weeks.
  const perYear = (total: number | null) =>
    total === null || yearsOwned === null || yearsOwned < 0.25 ? null : total / yearsOwned;

  return {
    maintenance,
    purchasePrice,
    soldPrice,
    netCost,
    yearsOwned,
    maintenancePerYear: perYear(maintenance),
    costPerYear: perYear(netCost),
  };
}

export interface YearSpend {
  year: string;
  spent: number;
}

/** Maintenance spend grouped by calendar year, with zero-filled gaps so the axis is continuous. */
export function spendByYear(logs: MaintenanceLog[]): YearSpend[] {
  if (logs.length === 0) return [];
  const totals = new Map<number, number>();
  for (const log of logs) {
    const year = parseLocalDate(log.date).getFullYear();
    totals.set(year, (totals.get(year) ?? 0) + log.cost);
  }
  const years = [...totals.keys()];
  const result: YearSpend[] = [];
  for (let y = Math.min(...years); y <= Math.max(...years); y++) {
    result.push({ year: String(y), spent: Math.round((totals.get(y) ?? 0) * 100) / 100 });
  }
  return result;
}
