import { FUEL_TYPES, SERVICE_TYPES } from '../types';
import type { FuelType, MaintenanceLog, ServiceType, Vehicle } from '../types';

export const STORAGE_KEYS = { vehicles: 'vt_vehicles', logs: 'vt_logs' } as const;
export const BACKUP_VERSION = 1;

export interface GarageData {
  vehicles: Vehicle[];
  logs: MaintenanceLog[];
}

export interface Backup extends GarageData {
  app: 'lube-and-log';
  version: number;
  exportedAt: string;
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const isDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const optStr = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const optDate = (v: unknown) => (isDate(v) ? v : undefined);
const optNum = (v: unknown) => (isNum(v) ? v : null);

/** Coerce an unknown value into a Vehicle, or null if it is missing required fields. */
export function parseVehicle(raw: unknown): Vehicle | null {
  if (!isObject(raw)) return null;
  const { id, year, make, model, currentMileage, fuelType } = raw;
  if (typeof id !== 'string' || !isNum(year) || typeof make !== 'string' || typeof model !== 'string') return null;
  if (!isNum(currentMileage)) return null;
  return {
    id,
    year,
    make,
    model,
    currentMileage,
    fuelType: FUEL_TYPES.includes(fuelType as FuelType) ? (fuelType as FuelType) : 'Gas',
    vin: optStr(raw.vin),
    licensePlate: optStr(raw.licensePlate),
    purchaseDate: optDate(raw.purchaseDate),
    purchasePrice: optNum(raw.purchasePrice),
    soldDate: optDate(raw.soldDate),
    soldPrice: optNum(raw.soldPrice),
  };
}

export function parseLog(raw: unknown): MaintenanceLog | null {
  if (!isObject(raw)) return null;
  const { id, vehicleId, date, serviceType, cost, mileage } = raw;
  if (typeof id !== 'string' || typeof vehicleId !== 'string' || !isDate(date)) return null;
  if (!isNum(cost) || !isNum(mileage)) return null;
  return {
    id,
    vehicleId,
    date,
    serviceType: SERVICE_TYPES.includes(serviceType as ServiceType) ? (serviceType as ServiceType) : 'Other',
    cost,
    mileage,
    notes: optStr(raw.notes),
  };
}

function parseList<T>(raw: unknown, parse: (r: unknown) => T | null): T[] {
  return Array.isArray(raw) ? raw.map(parse).filter((x): x is T => x !== null) : [];
}

/** Validate a backup file's contents. Throws a user-facing message if it isn't usable. */
export function parseBackup(text: string): GarageData {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  if (!isObject(raw) || !Array.isArray(raw.vehicles) || !Array.isArray(raw.logs)) {
    throw new Error('That file is not a Lube&Log backup.');
  }
  const vehicles = parseList(raw.vehicles, parseVehicle);
  const ids = new Set(vehicles.map((v) => v.id));
  // Drop orphaned logs so the app never renders history for a vehicle that doesn't exist.
  const logs = parseList(raw.logs, parseLog).filter((l) => ids.has(l.vehicleId));
  return { vehicles, logs };
}

export function createBackup(data: GarageData, now = new Date()): Backup {
  return { app: 'lube-and-log', version: BACKUP_VERSION, exportedAt: now.toISOString(), ...data };
}

/** Read a list from localStorage, falling back when it is missing, unreadable or corrupt. */
export function loadList<T>(key: string, parse: (r: unknown) => T | null, fallback: () => T[]): T[] {
  try {
    const saved = localStorage.getItem(key);
    if (saved === null) return fallback();
    const parsed: unknown = JSON.parse(saved);
    return Array.isArray(parsed) ? parseList(parsed, parse) : fallback();
  } catch {
    return fallback();
  }
}

export function saveList(key: string, value: unknown[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked (private mode) — the app keeps working in memory.
  }
}
