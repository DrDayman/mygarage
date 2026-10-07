import { describe, expect, it } from 'vitest';
import type { MaintenanceLog, Vehicle } from '../types';
import { computeServiceHealth, computeVehicleHealth, describeHealth, describeRule, fleetAlerts, latestLog, MAINTENANCE_RULES, rulesForVehicle } from './maintenance';
import { createSeedData } from '../data/seed';

const TODAY = '2026-10-07';
const rule = (type: string) => MAINTENANCE_RULES.find((r) => r.serviceType === type)!;

const car = (over: Partial<Vehicle> = {}): Vehicle => ({
  id: 'c1',
  year: 2020,
  make: 'Mazda',
  model: '3',
  currentMileage: 50_000,
  fuelType: 'Gas',
  purchaseDate: '2020-01-01',
  ...over,
});

const log = (over: Partial<MaintenanceLog>): MaintenanceLog => ({
  id: Math.random().toString(),
  vehicleId: 'c1',
  date: '2026-09-01',
  serviceType: 'Oil Change',
  cost: 50,
  mileage: 49_000,
  ...over,
});

describe('rulesForVehicle', () => {
  it('skips oil changes and transmission fluid for EVs', () => {
    const types = rulesForVehicle(car({ fuelType: 'EV' })).map((r) => r.serviceType);
    expect(types).not.toContain('Oil Change');
    expect(types).not.toContain('Transmission Fluid');
    expect(types).toContain('Tire Rotation');
  });

  it('includes oil changes for gas, diesel and hybrid', () => {
    for (const fuelType of ['Gas', 'Diesel', 'Hybrid'] as const) {
      expect(rulesForVehicle(car({ fuelType })).map((r) => r.serviceType)).toContain('Oil Change');
    }
  });
});

describe('computeServiceHealth', () => {
  it('is good shortly after a service', () => {
    const h = computeServiceHealth(car(), [log({ mileage: 49_000, date: '2026-09-01' })], rule('Oil Change'), TODAY);
    expect(h.status).toBe('good');
    expect(h.milesRemaining).toBe(4_000);
    expect(h.daysRemaining).toBe(145);
  });

  it('is due soon past 85% of the mileage interval', () => {
    const h = computeServiceHealth(car(), [log({ mileage: 45_500, date: '2026-09-01' })], rule('Oil Change'), TODAY);
    expect(h.status).toBe('due-soon');
    expect(h.limitedBy).toBe('miles');
    expect(describeHealth(h)).toBe('Due in 500 mi · 145 days');
  });

  it('is overdue on mileage', () => {
    const h = computeServiceHealth(car(), [log({ mileage: 44_000, date: '2026-09-01' })], rule('Oil Change'), TODAY);
    expect(h.status).toBe('overdue');
    expect(describeHealth(h)).toBe('Overdue by 1,000 mi');
  });

  it('is overdue on time even with few miles driven ("whichever comes first")', () => {
    const h = computeServiceHealth(car(), [log({ mileage: 49_500, date: '2026-01-01' })], rule('Oil Change'), TODAY);
    expect(h.status).toBe('overdue');
    expect(h.limitedBy).toBe('time');
    expect(describeHealth(h)).toBe('Overdue by 98 days');
  });

  it('assumes a never-logged service was last done when new', () => {
    const h = computeServiceHealth(car({ currentMileage: 30_000 }), [], rule('Brake Pads'), TODAY);
    expect(h.lastService).toBeUndefined();
    expect(h.milesRemaining).toBe(10_000);
    expect(h.status).toBe('good');
  });

  it('uses the purchase date as the time baseline when never logged', () => {
    const h = computeServiceHealth(car({ purchaseDate: '2026-01-07' }), [], rule('Inspection'), TODAY);
    expect(h.daysRemaining).toBe(92);
  });

  it('time-only rules ignore mileage', () => {
    const h = computeServiceHealth(car({ currentMileage: 999_999 }), [log({ serviceType: 'Inspection', date: '2026-06-01' })], rule('Inspection'), TODAY);
    expect(h.milesRemaining).toBeUndefined();
    expect(h.status).toBe('good');
  });

  it('only counts logs of the matching service type', () => {
    const h = computeServiceHealth(car(), [log({ serviceType: 'Tire Rotation', mileage: 49_900 })], rule('Oil Change'), TODAY);
    expect(h.lastService).toBeUndefined();
  });
});

describe('latestLog', () => {
  it('picks the highest-mileage record, regardless of insertion order', () => {
    const logs = [log({ id: 'b', mileage: 40_000 }), log({ id: 'a', mileage: 45_000 }), log({ id: 'c', mileage: 30_000 })];
    expect(latestLog(logs, 'Oil Change')?.id).toBe('a');
  });
});

describe('describeRule', () => {
  it('formats mileage and time intervals', () => {
    expect(describeRule(rule('Oil Change'))).toBe('Every 5,000 mi or 6 mo');
    expect(describeRule(rule('Inspection'))).toBe('Every 1 yr');
    expect(describeRule(rule('Brake Pads'))).toBe('Every 40,000 mi');
  });
});

describe('fleetAlerts', () => {
  it('ignores sold vehicles and sorts overdue first', () => {
    const vehicles = [car({ id: 'a', currentMileage: 100_000 }), car({ id: 'sold', currentMileage: 100_000, soldDate: '2025-01-01' })];
    const alerts = fleetAlerts(vehicles, [], TODAY);
    expect(alerts.every((a) => a.vehicle.id === 'a')).toBe(true);
    const statuses = alerts.map((a) => a.status);
    expect(statuses.indexOf('due-soon') === -1 || statuses.lastIndexOf('overdue') < statuses.indexOf('due-soon')).toBe(true);
  });

  it('seed data demonstrates every status', () => {
    const { vehicles, logs } = createSeedData(TODAY);
    const statuses = new Set(
      vehicles.filter((v) => !v.soldDate).flatMap((v) => computeVehicleHealth(v, logs.filter((l) => l.vehicleId === v.id), TODAY).map((h) => h.status)),
    );
    expect(statuses).toEqual(new Set(['good', 'due-soon', 'overdue']));
  });
});
