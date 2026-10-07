import { describe, expect, it } from 'vitest';
import { addMonths, daysBetween, formatDate, parseLocalDate, toISODate } from './format';
import { escapeCsvCell, logsToCsv } from './csv';
import { createBackup, loadList, parseBackup, parseVehicle } from './storage';
import { mapNhtsaResult, normalizeVin, titleCaseMake, validateVin } from './vin';
import { ownershipSummary, spendByYear } from './stats';
import type { MaintenanceLog, Vehicle } from '../types';

const vehicle: Vehicle = { id: 'v1', year: 2018, make: 'Toyota', model: 'Tacoma', currentMileage: 60_000, fuelType: 'Gas' };
const logs: MaintenanceLog[] = [
  { id: 'a', vehicleId: 'v1', date: '2022-03-01', serviceType: 'Oil Change', cost: 80, mileage: 40_000 },
  { id: 'b', vehicleId: 'v1', date: '2024-07-15', serviceType: 'Brake Pads', cost: 320.5, mileage: 55_000, notes: 'Front, "ceramic", OEM' },
  { id: 'c', vehicleId: 'v1', date: '2024-01-10', serviceType: 'Tire Rotation', cost: 40, mileage: 50_000 },
];

describe('dates', () => {
  it('parses YYYY-MM-DD as a local date (no off-by-one in western time zones)', () => {
    const d = parseLocalDate('2024-05-10');
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2024, 4, 10]);
    expect(toISODate(d)).toBe('2024-05-10');
    expect(formatDate('2024-05-10')).toContain('10');
  });

  it('adds months and counts days', () => {
    expect(addMonths('2024-01-15', 6)).toBe('2024-07-15');
    expect(daysBetween('2024-01-01', '2025-01-01')).toBe(366);
    expect(daysBetween('2024-03-09', '2024-03-11')).toBe(2);
  });
});

describe('csv', () => {
  it('escapes quotes, commas and newlines', () => {
    expect(escapeCsvCell('a,b')).toBe('"a,b"');
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvCell('line\nbreak')).toBe('"line\nbreak"');
    expect(escapeCsvCell(undefined)).toBe('');
  });

  it('neutralises spreadsheet formula injection', () => {
    expect(escapeCsvCell('=HYPERLINK("http://evil")')).toBe(`"'=HYPERLINK(""http://evil"")"`);
    expect(escapeCsvCell('+1')).toBe("'+1");
  });

  it('exports logs oldest-first with vehicle names', () => {
    const lines = logsToCsv(logs, [vehicle]).split('\r\n');
    expect(lines[0]).toBe('Vehicle,Date,Service Type,Mileage,Cost (USD),Notes');
    expect(lines[1]).toBe('2018 Toyota Tacoma,2022-03-01,Oil Change,40000,80.00,');
    expect(lines[3]).toBe('2018 Toyota Tacoma,2024-07-15,Brake Pads,55000,320.50,"Front, ""ceramic"", OEM"');
  });
});

describe('storage', () => {
  it('round-trips a backup', () => {
    const backup = createBackup({ vehicles: [vehicle], logs });
    expect(parseBackup(JSON.stringify(backup))).toEqual({ vehicles: [{ ...vehicle, purchasePrice: null, soldPrice: null }], logs });
  });

  it('rejects non-backup files with a helpful message', () => {
    expect(() => parseBackup('not json')).toThrow('not valid JSON');
    expect(() => parseBackup('{"foo":1}')).toThrow('not a myGarage backup');
  });

  it('drops malformed records and orphaned logs', () => {
    const data = parseBackup(
      JSON.stringify({
        vehicles: [vehicle, { id: 'bad' }],
        logs: [...logs, { ...logs[0], id: 'orphan', vehicleId: 'missing' }, { id: 'x' }],
      }),
    );
    expect(data.vehicles).toHaveLength(1);
    expect(data.logs.map((l) => l.id)).toEqual(['a', 'b', 'c']);
  });

  it('defaults unknown enum values instead of crashing', () => {
    expect(parseVehicle({ ...vehicle, fuelType: 'Steam' })?.fuelType).toBe('Gas');
  });

  it('falls back when localStorage holds corrupt JSON', () => {
    localStorage.setItem('k', '{oops');
    expect(loadList('k', parseVehicle, () => [vehicle])).toEqual([vehicle]);
  });
});

describe('vin', () => {
  it('validates VIN format', () => {
    expect(validateVin('1HGCM82633A004352')).toBeNull();
    expect(validateVin('1HGCM8263')).toMatch(/17 characters/);
    expect(validateVin('1HGCM82633A00435O')).toMatch(/I, O or Q/);
  });

  it('normalises input', () => {
    expect(normalizeVin(' 1hgcm-82633a004352 ')).toBe('1HGCM82633A004352');
  });

  it('title-cases makes but keeps short acronyms', () => {
    expect(titleCaseMake('TOYOTA')).toBe('Toyota');
    expect(titleCaseMake('MERCEDES-BENZ')).toBe('Mercedes-Benz');
    expect(titleCaseMake('BMW')).toBe('BMW');
  });

  it('maps NHTSA results including fuel type', () => {
    expect(mapNhtsaResult({ Make: 'TESLA', Model: 'Model 3', ModelYear: '2021', FuelTypePrimary: 'Electric', ElectrificationLevel: 'BEV (Battery Electric Vehicle)' })).toEqual({
      make: 'Tesla',
      model: 'Model 3',
      year: 2021,
      fuelType: 'EV',
    });
    expect(mapNhtsaResult({ Make: 'TOYOTA', Model: 'Prius', ModelYear: '2019', FuelTypePrimary: 'Gasoline', FuelTypeSecondary: 'Electric', ElectrificationLevel: 'Strong HEV (Hybrid Electric Vehicle)' }).fuelType).toBe('Hybrid');
    expect(mapNhtsaResult({ Make: 'FORD', Model: 'F-250', ModelYear: '2020', FuelTypePrimary: 'Diesel' }).fuelType).toBe('Diesel');
    expect(mapNhtsaResult({ ModelYear: '' }).year).toBeUndefined();
  });
});

describe('stats', () => {
  it('computes cost of ownership for a sold vehicle', () => {
    const sold = { ...vehicle, purchaseDate: '2020-01-01', purchasePrice: 30_000, soldDate: '2024-01-01', soldPrice: 20_000 };
    const s = ownershipSummary(sold, logs, '2026-01-01');
    expect(s.maintenance).toBe(440.5);
    expect(s.netCost).toBe(10_440.5);
    expect(s.yearsOwned).toBeCloseTo(4, 1);
    expect(s.costPerYear).toBeCloseTo(2610, -1);
  });

  it('leaves totals empty without a purchase price', () => {
    expect(ownershipSummary(vehicle, logs).netCost).toBeNull();
  });

  it('groups spend by year and fills empty years', () => {
    expect(spendByYear(logs)).toEqual([
      { year: '2022', spent: 80 },
      { year: '2023', spent: 0 },
      { year: '2024', spent: 360.5 },
    ]);
  });
});
