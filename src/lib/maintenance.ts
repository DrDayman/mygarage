import type { FuelType, ISODate, MaintenanceLog, ServiceType, Vehicle } from '../types';
import { addMonths, daysBetween, todayISO } from './format';

/**
 * A recurring service and when it comes due: every `miles`, every `months`, or
 * whichever comes first when both are set (the way owner's manuals phrase it).
 */
export interface MaintenanceRule {
  serviceType: ServiceType;
  miles?: number;
  months?: number;
  /** Fuel types the rule applies to. Omitted = all. */
  fuelTypes?: readonly FuelType[];
}

const COMBUSTION: readonly FuelType[] = ['Gas', 'Diesel', 'Hybrid'];

export const MAINTENANCE_RULES: readonly MaintenanceRule[] = [
  { serviceType: 'Oil Change', miles: 5_000, months: 6, fuelTypes: COMBUSTION },
  { serviceType: 'Tire Rotation', miles: 7_500, months: 12 },
  { serviceType: 'Air/Cabin Filter', miles: 20_000, months: 24 },
  { serviceType: 'Brake Pads', miles: 40_000 },
  { serviceType: 'Transmission Fluid', miles: 60_000, fuelTypes: COMBUSTION },
  { serviceType: 'Inspection', months: 12 },
];

/** Fraction of an interval used before a service is flagged as "due soon". */
export const DUE_SOON_THRESHOLD = 0.85;

export type HealthStatus = 'good' | 'due-soon' | 'overdue';

export interface ServiceHealth {
  rule: MaintenanceRule;
  /** Most recent log of this service type, if any. */
  lastService?: MaintenanceLog;
  milesRemaining?: number;
  daysRemaining?: number;
  /** 0..1+ — the larger of the mileage and time fractions used. */
  usage: number;
  status: HealthStatus;
  /** Which limit drives the status — the one closest to (or furthest past) due. */
  limitedBy: 'miles' | 'time';
}

export function rulesForVehicle(vehicle: Vehicle, rules = MAINTENANCE_RULES): MaintenanceRule[] {
  return rules.filter((r) => !r.fuelTypes || r.fuelTypes.includes(vehicle.fuelType));
}

/**
 * When a service has never been logged we assume it hasn't been done since the
 * car was new: mileage baseline 0, date baseline = purchase date (or Jan 1 of the model year).
 */
function baselineDate(vehicle: Vehicle): ISODate {
  return vehicle.purchaseDate || `${vehicle.year}-01-01`;
}

export function latestLog(logs: MaintenanceLog[], serviceType: ServiceType): MaintenanceLog | undefined {
  return logs
    .filter((l) => l.serviceType === serviceType)
    .reduce<MaintenanceLog | undefined>((latest, log) => {
      if (!latest) return log;
      if (log.mileage !== latest.mileage) return log.mileage > latest.mileage ? log : latest;
      return log.date > latest.date ? log : latest;
    }, undefined);
}

export function computeServiceHealth(
  vehicle: Vehicle,
  vehicleLogs: MaintenanceLog[],
  rule: MaintenanceRule,
  today: ISODate = todayISO(),
): ServiceHealth {
  const lastService = latestLog(vehicleLogs, rule.serviceType);

  let milesRemaining: number | undefined;
  let mileUsage = 0;
  if (rule.miles) {
    const milesSince = vehicle.currentMileage - (lastService?.mileage ?? 0);
    milesRemaining = rule.miles - milesSince;
    mileUsage = milesSince / rule.miles;
  }

  let daysRemaining: number | undefined;
  let timeUsage = 0;
  if (rule.months) {
    const from = lastService?.date ?? baselineDate(vehicle);
    const dueDate = addMonths(from, rule.months);
    daysRemaining = daysBetween(today, dueDate);
    const intervalDays = Math.max(1, daysBetween(from, dueDate));
    timeUsage = daysBetween(from, today) / intervalDays;
  }

  const usage = Math.max(mileUsage, timeUsage, 0);
  const status: HealthStatus = usage >= 1 ? 'overdue' : usage >= DUE_SOON_THRESHOLD ? 'due-soon' : 'good';
  const limitedBy = rule.miles && (!rule.months || mileUsage >= timeUsage) ? 'miles' : 'time';

  return { rule, lastService, milesRemaining, daysRemaining, usage, status, limitedBy };
}

export function computeVehicleHealth(
  vehicle: Vehicle,
  vehicleLogs: MaintenanceLog[],
  today: ISODate = todayISO(),
): ServiceHealth[] {
  return rulesForVehicle(vehicle).map((rule) => computeServiceHealth(vehicle, vehicleLogs, rule, today));
}

/** Human-readable "Due in 1,200 mi · 40 days" / "Overdue by 3,000 mi". */
export function describeHealth(h: ServiceHealth): string {
  const mi = (n: number) => `${Math.abs(n).toLocaleString('en-US')} mi`;
  const days = (n: number) => `${Math.abs(n).toLocaleString('en-US')} ${Math.abs(n) === 1 ? 'day' : 'days'}`;

  if (h.status === 'overdue') {
    return h.limitedBy === 'miles' && h.milesRemaining !== undefined
      ? `Overdue by ${mi(h.milesRemaining)}`
      : `Overdue by ${days(h.daysRemaining ?? 0)}`;
  }
  const parts: string[] = [];
  if (h.milesRemaining !== undefined) parts.push(mi(h.milesRemaining));
  if (h.daysRemaining !== undefined) parts.push(days(h.daysRemaining));
  return `Due in ${parts.join(' · ')}`;
}

export function describeRule(rule: MaintenanceRule): string {
  const parts: string[] = [];
  if (rule.miles) parts.push(`${rule.miles.toLocaleString('en-US')} mi`);
  if (rule.months) parts.push(rule.months % 12 === 0 ? `${rule.months / 12} yr` : `${rule.months} mo`);
  return `Every ${parts.join(' or ')}`;
}

const STATUS_RANK: Record<HealthStatus, number> = { overdue: 0, 'due-soon': 1, good: 2 };

export interface FleetAlert extends ServiceHealth {
  vehicle: Vehicle;
}

/** Overdue + due-soon services across all vehicles still owned, most urgent first. */
export function fleetAlerts(vehicles: Vehicle[], logs: MaintenanceLog[], today: ISODate = todayISO()): FleetAlert[] {
  return vehicles
    .filter((v) => !v.soldDate)
    .flatMap((vehicle) =>
      computeVehicleHealth(
        vehicle,
        logs.filter((l) => l.vehicleId === vehicle.id),
        today,
      ).map((h) => ({ ...h, vehicle })),
    )
    .filter((a) => a.status !== 'good')
    .sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || b.usage - a.usage);
}
