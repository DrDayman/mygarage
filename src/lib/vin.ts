import type { FuelType } from '../types';

export const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;

export function normalizeVin(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function validateVin(vin: string): string | null {
  if (vin.length !== 17) return `A VIN is 17 characters (you entered ${vin.length}).`;
  if (/[IOQ]/.test(vin)) return 'VINs never contain the letters I, O or Q.';
  if (!VIN_PATTERN.test(vin)) return 'VINs only contain letters and numbers.';
  return null;
}

export interface DecodedVin {
  make?: string;
  model?: string;
  year?: number;
  fuelType?: FuelType;
}

export function titleCaseMake(value: string): string {
  return value
    .toLowerCase()
    .replace(/[a-z]+/g, (w) => (w.length <= 3 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)));
}

interface NhtsaFlatResult {
  Make?: string;
  Model?: string;
  ModelYear?: string;
  FuelTypePrimary?: string;
  FuelTypeSecondary?: string;
  ElectrificationLevel?: string;
  ErrorCode?: string;
}

export function mapFuelType(r: NhtsaFlatResult): FuelType | undefined {
  const primary = (r.FuelTypePrimary ?? '').toLowerCase();
  const electrification = (r.ElectrificationLevel ?? '').toLowerCase();
  if (primary.includes('electric') && !r.FuelTypeSecondary) return 'EV';
  if (electrification.includes('bev')) return 'EV';
  if (electrification.includes('hev') || electrification.includes('hybrid') || r.FuelTypeSecondary) return 'Hybrid';
  if (primary.includes('diesel')) return 'Diesel';
  if (primary.includes('gasoline') || primary.includes('flex')) return 'Gas';
  return undefined;
}

export function mapNhtsaResult(r: NhtsaFlatResult): DecodedVin {
  const year = Number(r.ModelYear);
  return {
    make: r.Make ? titleCaseMake(r.Make) : undefined,
    model: r.Model || undefined,
    year: Number.isFinite(year) && year > 1900 ? year : undefined,
    fuelType: mapFuelType(r),
  };
}

export async function decodeVin(vin: string, signal?: AbortSignal): Promise<DecodedVin> {
  const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${encodeURIComponent(vin)}?format=json`, {
    signal,
  });
  if (!res.ok) throw new Error(`NHTSA returned ${res.status}`);
  const data = (await res.json()) as { Results?: NhtsaFlatResult[] };
  const decoded = mapNhtsaResult(data.Results?.[0] ?? {});
  if (!decoded.make && !decoded.model) throw new Error('No vehicle found for that VIN.');
  return decoded;
}
